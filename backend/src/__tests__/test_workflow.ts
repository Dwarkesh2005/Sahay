import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { user_role, verification_status, request_type } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_nature_secret_key_2026';

async function runTests() {
  console.log('🧪 Starting Sahay End-to-End Workflow Verification...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: Cities lookup
    console.log('--- Test Suite 1: Cities & Region Setup ---');
    const cities = await prisma.cities.findMany();
    assert(cities.length >= 5, `Database has cities seeded (found: ${cities.length})`);
    const lucknow = cities.find((c) => c.city_name.toLowerCase() === 'lucknow');
    assert(!!lucknow, 'Lucknow city exists in database');

    // Test 2: Admin user check & JWT validation
    console.log('\n--- Test Suite 2: Admin Authentication & RBAC ---');
    let admin = await prisma.users.findUnique({ where: { email: 'admin@sahay.org' } });
    if (!admin && lucknow) {
      const hash = await bcrypt.hash('Admin@12345', 10);
      admin = await prisma.users.create({
        data: {
          full_name: 'Admin Test',
          email: 'admin@sahay.org',
          password_hash: hash,
          role: user_role.ADMIN,
          city_id: lucknow.city_id,
          is_active: true,
          is_verified: true,
        },
      });
    }
    assert(!!admin && admin.role === user_role.ADMIN, 'Admin account exists with ADMIN role');

    const adminToken = jwt.sign(
      { user_id: admin!.user_id, email: admin!.email, role: admin!.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const decodedAdmin = jwt.verify(adminToken, JWT_SECRET) as any;
    assert(decodedAdmin.role === 'ADMIN', 'Admin JWT token generates and decodes correctly');

    // Test 3: Migrant registration & help request lifecycle
    console.log('\n--- Test Suite 3: User Request Lifecycle ---');
    const testMigrantEmail = `test_migrant_${Date.now()}@example.com`;
    const migrantHash = await bcrypt.hash('Password@123', 10);
    const migrantUser = await prisma.users.create({
      data: {
        full_name: 'Test Migrant Worker',
        email: testMigrantEmail,
        password_hash: migrantHash,
        role: user_role.MIGRANT,
        city_id: lucknow!.city_id,
        is_active: true,
        is_verified: true,
      },
    });
    assert(!!migrantUser && migrantUser.role === user_role.MIGRANT, 'Migrant user registered successfully');

    // Create Help Request
    const testRequest = await prisma.help_requests.create({
      data: {
        user_id: migrantUser.user_id,
        request_type: request_type.MEDICAL,
        title: 'Emergency medical aid test',
        description: 'Test request: worker needs urgent prescription medicines and checkup.',
        city_id: lucknow!.city_id,
        status: 'PENDING',
      },
    });
    assert(testRequest.status === 'PENDING', 'Help request created with status PENDING');

    // Test 4: NGO discovery & response
    console.log('\n--- Test Suite 4: NGO Response & Chat Creation ---');
    const testNgoEmail = `test_ngo_${Date.now()}@sahay.org`;
    const ngoHash = await bcrypt.hash('Password@123', 10);
    const ngoUser = await prisma.users.create({
      data: {
        full_name: 'Test Care Foundation',
        email: testNgoEmail,
        password_hash: ngoHash,
        role: user_role.NGO,
        city_id: lucknow!.city_id,
        is_active: true,
        is_verified: true,
      },
    });

    const ngoOrg = await prisma.ngos.create({
      data: {
        user_id: ngoUser.user_id,
        ngo_name: 'Test Care Foundation',
        contact_person: 'Dr. Test Care',
        city_id: lucknow!.city_id,
        address: 'Lucknow Central',
        verification_status: verification_status.PENDING,
      },
    });
    assert(!!ngoOrg, 'NGO organization record created');

    // NGO responds to the request
    const response = await prisma.request_responses.create({
      data: {
        request_id: testRequest.request_id,
        responder_id: ngoUser.user_id,
        response_message: 'Our medical team is dispatched to help you.',
        status: 'ACCEPTED',
      },
    });
    assert(response.status === 'ACCEPTED', 'NGO response created successfully');

    // Update help request status to ACCEPTED
    const acceptedRequest = await prisma.help_requests.update({
      where: { request_id: testRequest.request_id },
      data: { status: 'ACCEPTED' },
    });
    assert(acceptedRequest.status === 'ACCEPTED', 'Help request transitioned to ACCEPTED');

    // Create Chat and Message
    const chat = await prisma.chats.create({
      data: {
        request_id: testRequest.request_id,
        responder_id: ngoUser.user_id,
      },
    });
    assert(!!chat, 'Chat room initiated between Migrant and NGO');

    const msg = await prisma.messages.create({
      data: {
        chat_id: chat.chat_id,
        sender_id: ngoUser.user_id,
        message: 'Hello, we are 10 minutes away from your location.',
      },
    });
    assert(!!msg && msg.is_read === false, 'Chat message delivered');

    // NGO resolves the request
    const completedRequest = await prisma.help_requests.update({
      where: { request_id: testRequest.request_id },
      data: { status: 'COMPLETED' },
    });
    assert(completedRequest.status === 'COMPLETED', 'Help request completed and resolved successfully');

    // Test 5: Admin verification workflow
    console.log('\n--- Test Suite 5: Admin NGO Verification ---');
    const verifiedNgo = await prisma.ngos.update({
      where: { ngo_id: ngoOrg.ngo_id },
      data: { verification_status: verification_status.GOVERNMENT_VERIFIED },
    });
    assert(
      verifiedNgo.verification_status === verification_status.GOVERNMENT_VERIFIED,
      'Admin verified NGO with GOVERNMENT_VERIFIED status'
    );

    // Cleanup test records
    await prisma.messages.deleteMany({ where: { chat_id: chat.chat_id } });
    await prisma.chats.deleteMany({ where: { chat_id: chat.chat_id } });
    await prisma.request_responses.deleteMany({ where: { request_id: testRequest.request_id } });
    await prisma.help_requests.deleteMany({ where: { request_id: testRequest.request_id } });
    await prisma.ngos.deleteMany({ where: { ngo_id: ngoOrg.ngo_id } });
    await prisma.users.deleteMany({ where: { user_id: { in: [migrantUser.user_id, ngoUser.user_id] } } });

    console.log('\n========================================');
    console.log(`📊 Summary: ${passed} passed, ${failed} failed`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test execution error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
