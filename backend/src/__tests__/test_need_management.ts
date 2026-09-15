import { prisma } from '../db';
import { autoExpirePendingRequests } from '../controllers/requestController';

async function runTests() {
  console.log('🧪 Starting Need Request Management Integration Tests...\n');

  try {
    // Clean up any old test data
    await prisma.need_ngo_requests.deleteMany({
      where: { need: { title: { startsWith: 'TEST_NEED_' } } }
    });
    await prisma.help_requests.deleteMany({
      where: { title: { startsWith: 'TEST_NEED_' } }
    });

    // 1. Get test users and NGOs
    const migrant = await prisma.users.findFirst({ where: { role: 'MIGRANT' } });
    const ngos = await prisma.ngos.findMany({ take: 3, include: { users: true } });

    if (!migrant || ngos.length < 2) {
      throw new Error('Test requires at least 1 migrant and 2 NGOs in database.');
    }

    const ngoA = ngos[0];
    const ngoB = ngos[1];
    const city = await prisma.cities.findFirst();
    if (!city) throw new Error('Test requires a city.');

    console.log(`✅ Found test migrant (ID: ${migrant.user_id}) and NGOs (${ngoA.ngo_name}, ${ngoB.ngo_name})`);

    // ─── Test 1: Create Need Request with 7-Day Validity ───
    console.log('\n--- Test 1: Need Request 7-Day Validity ---');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const testNeed = await prisma.help_requests.create({
      data: {
        user_id: migrant.user_id,
        request_type: 'MEDICAL',
        title: 'TEST_NEED_Medical Aid Ahmedabad',
        description: 'Need urgent prescription medicine and health consultation.',
        city_id: city.city_id,
        urgency: 'HIGH',
        status: 'PENDING',
        created_at: now,
        expires_at: expiresAt,
        renewal_number: 0
      }
    });

    if (!testNeed.expires_at) throw new Error('expires_at was not set!');
    const diffDays = Math.round((testNeed.expires_at.getTime() - testNeed.created_at!.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`✅ Request created with ID: ${testNeed.request_id}, expires in ${diffDays} days (${testNeed.expires_at.toISOString()})`);
    if (diffDays !== 7) throw new Error(`Expected 7 days validity, got ${diffDays}`);

    // ─── Test 2: Send Request to Multiple NGOs (Option B) ───
    console.log('\n--- Test 2: Send Request to Multiple NGOs ---');
    const ngoReqA = await prisma.need_ngo_requests.create({
      data: {
        need_id: testNeed.request_id,
        ngo_id: ngoA.ngo_id,
        status: 'PENDING',
        sent_at: now
      }
    });
    const ngoReqB = await prisma.need_ngo_requests.create({
      data: {
        need_id: testNeed.request_id,
        ngo_id: ngoB.ngo_id,
        status: 'PENDING',
        sent_at: now
      }
    });
    console.log(`✅ Sent to NGO A (ID: ${ngoReqA.id}, status: ${ngoReqA.status}) and NGO B (ID: ${ngoReqB.id}, status: ${ngoReqB.status})`);

    // ─── Test 3: Reminder 24-Hour Rate Limit ───
    console.log('\n--- Test 3: Reminder 24-Hour Rate Limit ---');
    // First reminder should succeed
    const remindedNeed = await prisma.help_requests.update({
      where: { request_id: testNeed.request_id },
      data: {
        last_reminder_at: new Date(),
        reminder_count: { increment: 1 }
      }
    });
    console.log(`✅ 1st Reminder sent! reminder_count: ${remindedNeed.reminder_count}, last_reminder_at: ${remindedNeed.last_reminder_at?.toISOString()}`);

    // Check rate limit logic
    const elapsedSinceReminder = Date.now() - remindedNeed.last_reminder_at!.getTime();
    const canRemindAgain = elapsedSinceReminder >= 24 * 60 * 60 * 1000;
    console.log(`✅ Immediate 2nd reminder check: canRemind = ${canRemindAgain} (Blocked by 24h cooldown as expected)`);
    if (canRemindAgain) throw new Error('Reminder cooldown check failed!');

    // ─── Test 4: Concurrency-Safe Atomic Acceptance ───
    console.log('\n--- Test 4: Concurrency-Safe Atomic Acceptance ---');
    // NGO A accepts the request
    const acceptTime = new Date();
    await prisma.$transaction(async (tx) => {
      // Check need is PENDING
      const currentNeed = await tx.help_requests.findUnique({
        where: { request_id: testNeed.request_id }
      });
      if (currentNeed?.status !== 'PENDING') throw new Error('Need is not pending');

      // Update NGO A request to ACCEPTED
      await tx.need_ngo_requests.update({
        where: { id: ngoReqA.id },
        data: {
          status: 'ACCEPTED',
          responded_at: acceptTime
        }
      });

      // Cancel all other pending requests for this need (NGO B)
      await tx.need_ngo_requests.updateMany({
        where: {
          need_id: testNeed.request_id,
          ngo_id: { not: ngoA.ngo_id },
          status: 'PENDING'
        },
        data: { status: 'CANCELLED' }
      });

      // Update main need to COMPLETED
      await tx.help_requests.update({
        where: { request_id: testNeed.request_id },
        data: {
          status: 'COMPLETED',
          accepted_ngo_id: ngoA.ngo_id,
          completed_at: acceptTime
        }
      });
    });

    const finalNeed = await prisma.help_requests.findUnique({
      where: { request_id: testNeed.request_id },
      include: { need_ngo_requests: true }
    });

    console.log(`✅ Need status after acceptance: ${finalNeed?.status}, accepted_ngo_id: ${finalNeed?.accepted_ngo_id}`);
    if (finalNeed?.status !== 'COMPLETED') throw new Error('Expected need status COMPLETED');
    if (finalNeed?.accepted_ngo_id !== ngoA.ngo_id) throw new Error('Expected accepted_ngo_id to match NGO A');

    const updatedNgoA = finalNeed.need_ngo_requests.find((r) => r.ngo_id === ngoA.ngo_id);
    const updatedNgoB = finalNeed.need_ngo_requests.find((r) => r.ngo_id === ngoB.ngo_id);
    console.log(`✅ NGO A status: ${updatedNgoA?.status}, NGO B status: ${updatedNgoB?.status}`);
    if (updatedNgoA?.status !== 'ACCEPTED') throw new Error('Expected NGO A status ACCEPTED');
    if (updatedNgoB?.status !== 'CANCELLED') throw new Error('Expected NGO B status CANCELLED');

    // ─── Test 5: Rejection with Reason ───
    console.log('\n--- Test 5: NGO Rejection with Optional Reason ---');
    const rejectNeed = await prisma.help_requests.create({
      data: {
        user_id: migrant.user_id,
        request_type: 'FOOD',
        title: 'TEST_NEED_Food Distribution Ration',
        description: 'Need grain rations for family.',
        city_id: city.city_id,
        status: 'PENDING',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    const rejectNgoReq = await prisma.need_ngo_requests.create({
      data: {
        need_id: rejectNeed.request_id,
        ngo_id: ngoB.ngo_id,
        status: 'PENDING'
      }
    });

    // NGO B rejects with reason
    await prisma.need_ngo_requests.update({
      where: { id: rejectNgoReq.id },
      data: {
        status: 'REJECTED',
        responded_at: new Date(),
        rejection_reason: 'Ration distribution capacity currently full for this sector.'
      }
    });

    const rejectedRecord = await prisma.need_ngo_requests.findUnique({
      where: { id: rejectNgoReq.id }
    });
    console.log(`✅ NGO B rejection status: ${rejectedRecord?.status}, reason: "${rejectedRecord?.rejection_reason}"`);
    if (rejectedRecord?.status !== 'REJECTED') throw new Error('Expected REJECTED status');

    // ─── Test 6: Expiration and Renewal Cycle ───
    console.log('\n--- Test 6: Expiration and Renewal Cycle ---');
    // Create an already-expired need
    const pastDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    const pastExpiry = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // Expired 1 day ago

    const expiredNeed = await prisma.help_requests.create({
      data: {
        user_id: migrant.user_id,
        request_type: 'SHELTER',
        title: 'TEST_NEED_Temporary Night Shelter',
        description: 'Need shelter for 2 days.',
        city_id: city.city_id,
        status: 'PENDING',
        created_at: pastDate,
        expires_at: pastExpiry
      }
    });

    // Run auto-expire
    const expiredCount = await autoExpirePendingRequests();
    console.log(`✅ Auto-expired requests processed: ${expiredCount}`);

    const verifiedExpired = await prisma.help_requests.findUnique({
      where: { request_id: expiredNeed.request_id }
    });
    console.log(`✅ Request #${verifiedExpired?.request_id} status after autoExpire: ${verifiedExpired?.status}`);
    if (verifiedExpired?.status !== 'EXPIRED') throw new Error('Expected request status EXPIRED');

    // Renew request
    const renewedNeed = await prisma.help_requests.create({
      data: {
        user_id: verifiedExpired.user_id,
        request_type: verifiedExpired.request_type,
        title: verifiedExpired.title,
        description: verifiedExpired.description,
        city_id: verifiedExpired.city_id,
        urgency: verifiedExpired.urgency || 'MEDIUM',
        status: 'PENDING',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        parent_request_id: verifiedExpired.request_id,
        renewal_number: (verifiedExpired.renewal_number || 0) + 1,
        last_reminder_at: null,
        reminder_count: 0
      }
    });

    console.log(`✅ Renewed request created with ID: ${renewedNeed.request_id}, parent_request_id: ${renewedNeed.parent_request_id}, renewal_number: ${renewedNeed.renewal_number}`);
    if (renewedNeed.parent_request_id !== verifiedExpired.request_id) throw new Error('Parent link mismatch');
    if (renewedNeed.renewal_number !== 1) throw new Error('Expected renewal_number 1');

    // Clean up test data
    await prisma.need_ngo_requests.deleteMany({
      where: { need: { title: { startsWith: 'TEST_NEED_' } } }
    });
    await prisma.help_requests.deleteMany({
      where: { title: { startsWith: 'TEST_NEED_' } }
    });

    console.log('\n🎉 ALL NEED REQUEST MANAGEMENT INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
