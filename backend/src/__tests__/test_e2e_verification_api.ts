import http from 'http';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { user_role } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/authRoutes';
import citiesRoutes from '../routes/citiesRoutes';
import ngoRoutes from '../routes/ngoRoutes';
import adminRoutes from '../routes/adminRoutes';
import verificationRoutes from '../routes/verificationRoutes';
import { VerificationController } from '../controllers/verificationController';

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_nature_secret_key_2026';

// Build a test express app instance
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/cities', citiesRoutes);
  app.use('/api/ngos/verification', verificationRoutes);
  app.use('/api/ngos', ngoRoutes);
  app.use('/api/admin', adminRoutes);
  app.get('/api/verification/document/download', VerificationController.downloadSignedDocument);

  return app;
}

async function runE2ETests() {
  console.log('🚀 Starting Full End-to-End NGO Verification API & Security Test...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  const app = createTestApp();
  const testPort = 5555;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(testPort, resolve));
  const baseUrl = `http://localhost:${testPort}/api`;

  try {
    const pwdHash = await bcrypt.hash('Password123', 10);
    const timestamp = Date.now();

    // 1. Setup Admin
    const adminUser = await prisma.users.create({
      data: {
        full_name: 'E2E Admin Reviewer',
        email: `admin_${timestamp}@sahay.org`,
        password_hash: pwdHash,
        role: user_role.ADMIN,
        is_active: true,
        is_verified: true,
      },
    });

    const adminToken = jwt.sign(
      { user_id: adminUser.user_id, email: adminUser.email, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Setup Normal Migrant User (for security tests)
    const normalUser = await prisma.users.create({
      data: {
        full_name: 'Regular Migrant',
        email: `migrant_${timestamp}@example.com`,
        password_hash: pwdHash,
        role: user_role.MIGRANT,
        is_active: true,
        is_verified: true,
      },
    });

    const normalUserToken = jwt.sign(
      { user_id: normalUser.user_id, email: normalUser.email, role: 'MIGRANT' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Register NGO via API
    const ngoEmail = `e2e_ngo_${timestamp}@example.com`;
    const randomPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'NGO',
        fullName: 'Dr. Anita Sharma',
        email: ngoEmail,
        phone: randomPhone,
        password: 'Password123',
        city: 'Lucknow',
        ngoName: 'Asha Kalyan Trust',
        registrationNumber: `REG-LKO-${timestamp}`,
        pan: 'ABCDE1234F',
        ngoAddress: 'Plot 12, Hazratganj, Lucknow',
      }),
    });

    assert(regRes.status === 201, `NGO registered via /api/auth/register (Status: ${regRes.status})`);

    // 4. Login NGO to obtain token
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ngoEmail, password: 'Password123' }),
    });
    const loginData = (await loginRes.json()) as any;
    const ngoToken = loginData.token;
    assert(!!ngoToken, 'NGO successfully logged in and obtained JWT');

    // 5. Check Initial Verification Status
    const verifRes = await fetch(`${baseUrl}/ngos/verification`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    const verifData = (await verifRes.json()) as any;
    assert(verifRes.status === 200, 'GET /api/ngos/verification returns 200');
    assert(verifData.verification.status === 'NOT_SUBMITTED', "Initial verification status is 'NOT_SUBMITTED'");

    // 6. Security Test: Normal User Cannot Access Verification Endpoints
    const securityRes1 = await fetch(`${baseUrl}/ngos/verification`, {
      headers: { Authorization: `Bearer ${normalUserToken}` },
    });
    assert(securityRes1.status === 403, 'Normal user accessing /api/ngos/verification returns 403 Forbidden');

    // 7. Security Test: NGO Cannot Call Admin Endpoints
    const securityRes2 = await fetch(`${baseUrl}/admin/verifications`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    assert(securityRes2.status === 403, 'NGO accessing /api/admin/verifications returns 403 Forbidden');

    // 8. Upload a Document
    const testDocContent = `GOVERNMENT OF UTTAR PRADESH
Department of Registration
REGISTRATION CERTIFICATE
Certificate No: REG-LKO-2026
This is to certify that: Asha Kalyan Trust
PAN: ABCDE1234F
Registered Office: Plot 12, Hazratganj, Lucknow 226001
Date of Registration: 15/01/2020`;

    const tempDocPath = path.join(__dirname, `sample_cert_${timestamp}.pdf`);
    fs.writeFileSync(tempDocPath, testDocContent);

    const formData = new FormData();
    const fileBlob = new Blob([testDocContent], { type: 'application/pdf' });
    formData.append('document', fileBlob, 'Registration_Certificate_2026.pdf');
    formData.append('document_type', 'REGISTRATION_CERTIFICATE');

    const uploadRes = await fetch(`${baseUrl}/ngos/verification/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ngoToken}` },
      body: formData,
    });

    assert(uploadRes.status === 201, `Document upload succeeded (Status: ${uploadRes.status})`);
    const uploadData = (await uploadRes.json()) as any;
    const uploadedDocId = uploadData.document.document_id;
    assert(uploadData.document.version === 1, 'Uploaded document tracked as version 1');

    // 9. List Uploaded Documents
    const docsRes = await fetch(`${baseUrl}/ngos/verification/documents`, {
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    const docsData = (await docsRes.json()) as any;
    assert(docsData.documents.length >= 1, `Listed uploaded documents (Count: ${docsData.documents.length})`);

    // 10. Run Document Screening
    const procRes = await fetch(`${baseUrl}/ngos/verification/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    assert(procRes.status === 200, `Automated screening executed (Status: ${procRes.status})`);
    const procData = (await procRes.json()) as any;
    assert(
      procData.verification.status === 'NEEDS_ADMIN_REVIEW',
      "Verification status moved to 'NEEDS_ADMIN_REVIEW'"
    );
    assert(procData.verification.screening_score >= 0, `Screening score generated: ${procData.verification.screening_score}%`);

    // 11. Admin Views Verification Queue
    const adminQueueRes = await fetch(`${baseUrl}/admin/verifications?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminQueueData = (await adminQueueRes.json()) as any;
    assert(adminQueueRes.status === 200, 'Admin queue returned 200');
    assert(adminQueueData.verifications.length >= 1, 'Verification queue lists pending cases');

    const targetVerifId = procData.verification.verification_id;

    // 12. Admin Views Detailed Verification Case
    const adminDetailRes = await fetch(`${baseUrl}/admin/verifications/${targetVerifId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminDetailData = (await adminDetailRes.json()) as any;
    assert(adminDetailRes.status === 200, 'Admin detailed case view returned 200');
    assert(adminDetailData.verification.fields.length >= 4, 'Side-by-side field comparison table populated with fields');

    // 13. Admin Generates Signed Document View URL
    const viewUrlRes = await fetch(
      `${baseUrl}/admin/verifications/${targetVerifId}/document/${uploadedDocId}/view`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const viewUrlData = (await viewUrlRes.json()) as any;
    assert(viewUrlRes.status === 200, 'Admin generated temporary signed URL for document preview');
    assert(viewUrlData.signedUrl.includes('/api/verification/document/download?token='), 'Signed URL formatted correctly');

    // 14. Access Document Via Signed Token Endpoint
    const tokenPart = viewUrlData.signedUrl.split('token=')[1];
    const docStreamRes = await fetch(`${baseUrl}/verification/document/download?token=${tokenPart}`);
    assert(docStreamRes.status === 200, 'Secure document streaming endpoint verified signed token and returned file');

    // 15. Security Test: Access Document Without Token
    const unauthorizedStreamRes = await fetch(`${baseUrl}/verification/document/download`);
    assert(unauthorizedStreamRes.status === 401, 'Document download without token returns 401 Unauthorized');

    // 16. Admin Requests Correction
    const corrRes = await fetch(`${baseUrl}/admin/verifications/${targetVerifId}/request-correction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        reason: 'Please upload an address proof document confirming the Hazratganj office address.',
      }),
    });
    assert(corrRes.status === 200, 'Admin requested correction (Status: 200)');
    const corrData = (await corrRes.json()) as any;
    assert(corrData.verification.status === 'NEEDS_CORRECTION', "Status successfully transitioned to 'NEEDS_CORRECTION'");

    // 16b. NGO Re-uploads Corrected Document (Version 2)
    const reuploadFormData = new FormData();
    const updatedCertBlob = new Blob([testDocContent + '\nOfficial Seal Verified: YES'], { type: 'application/pdf' });
    reuploadFormData.append('document', updatedCertBlob, 'Registration_Certificate_v2.pdf');
    reuploadFormData.append('document_type', 'REGISTRATION_CERTIFICATE');

    const reuploadRes = await fetch(`${baseUrl}/ngos/verification/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ngoToken}` },
      body: reuploadFormData,
    });
    assert(reuploadRes.status === 201, 'NGO re-uploaded corrected document (Status: 201)');

    // 16c. NGO Re-processes Document Screening
    const reprocessRes = await fetch(`${baseUrl}/ngos/verification/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ngoToken}` },
    });
    assert(reprocessRes.status === 200, 'NGO re-screened documents, moving status back to NEEDS_ADMIN_REVIEW');

    // 17. Admin Final Approval
    const approveRes = await fetch(`${baseUrl}/admin/verifications/${targetVerifId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        remarks: 'All certificates inspected and authenticated against official records.',
      }),
    });
    assert(approveRes.status === 200, 'Admin approval succeeded (Status: 200)');

    // 18. Verify NGO Verified Status in Database
    const finalNgo = await prisma.ngos.findFirst({ where: { email: ngoEmail } });
    assert(finalNgo?.verification_status === 'MANUALLY_VERIFIED', "NGO verification_status updated to 'MANUALLY_VERIFIED'");

    // Cleanup temp doc file
    if (fs.existsSync(tempDocPath)) fs.unlinkSync(tempDocPath);

    console.log(`\n🎉 E2E API & Security Test Suite Complete: ${passed} PASSED, ${failed} FAILED\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal error in E2E API test:', err);
  process.exit(1);
});
