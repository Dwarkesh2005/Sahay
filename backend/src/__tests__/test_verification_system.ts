import { NormalizationService } from '../services/normalizationService';
import { MatchingService } from '../services/matchingService';
import { VerificationStateMachine } from '../services/verificationStateMachine';
import { FileService } from '../services/fileService';
import { VerificationService } from '../services/verificationService';
import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import { user_role, doc_verification_status } from '@prisma/client';

async function runVerificationTests() {
  console.log('🧪 Starting Sahay NGO Verification System Test Suite...\n');
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

  // ==========================================
  // SUITE 1: Normalization Tests
  // ==========================================
  console.log('--- Test Suite 1: Normalization Engine ---');

  // Org Name
  const normOrg1 = NormalizationService.normalizeOrgName('  ABC FOUNDATION PVT. LTD. ');
  const normOrg2 = NormalizationService.normalizeOrgName('ABC Foundation Private Limited');
  assert(normOrg1 === normOrg2, `Legal suffix & case normalized identically: '${normOrg1}' === '${normOrg2}'`);

  const normOrg3 = NormalizationService.normalizeOrgName('Helping Hands & Hope Soc.');
  assert(normOrg3 === 'helping hands and hope society', `Ampersand and suffix normalized: '${normOrg3}'`);

  // PAN
  const normPan1 = NormalizationService.normalizePan(' abcde 1234 f ');
  assert(normPan1 === 'ABCDE1234F', `PAN normalized to uppercase & stripped spaces: '${normPan1}'`);

  // Registration Number
  const normReg = NormalizationService.normalizeRegistrationNumber(' REG / 12345 - UP ');
  assert(normReg === 'REG/12345-UP', `Registration number whitespace collapsed: '${normReg}'`);

  // Phone
  assert(NormalizationService.normalizePhone('+91 98765 43210') === '9876543210', 'Phone with +91 normalized to 10 digits');
  assert(NormalizationService.normalizePhone('09876543210') === '9876543210', 'Phone with leading 0 normalized to 10 digits');

  // Email
  assert(NormalizationService.normalizeEmail('  Contact@AbcFoundation.ORG ') === 'contact@abcfoundation.org', 'Email lowercased and trimmed');

  // Address
  const normAddr = NormalizationService.normalizeAddress('101, M.G. Rd., Opp. City Mall, Ahmedabad');
  assert(normAddr.includes('road') && normAddr.includes('opposite'), `Address road & opposite normalized: '${normAddr}'`);


  // ==========================================
  // SUITE 2: Field Matching Tests
  // ==========================================
  console.log('\n--- Test Suite 2: Matching Engine & Deterministic Rules ---');

  // Exact Name Match
  const mOrgExact = await MatchingService.compareField({
    fieldName: 'organization_name',
    submittedValue: 'ABC Foundation',
    extractedValue: 'ABC Foundation',
  });
  assert(mOrgExact.result === 'MATCH', 'Exact organization name produces MATCH');

  // Case & Whitespace difference
  const mOrgCase = await MatchingService.compareField({
    fieldName: 'organization_name',
    submittedValue: 'ABC Foundation',
    extractedValue: '  abc foundation  ',
  });
  assert(mOrgCase.result === 'MATCH', 'Case and whitespace differences produce MATCH');

  // Minor Legal suffix difference
  const mOrgSuffix = await MatchingService.compareField({
    fieldName: 'organization_name',
    submittedValue: 'ABC Foundation Pvt. Ltd.',
    extractedValue: 'ABC Foundation Private Limited',
  });
  assert(mOrgSuffix.result === 'MATCH', 'Legal suffix abbreviation differences produce MATCH');

  // Fuzzy Org mismatch
  const mOrgMismatch = await MatchingService.compareField({
    fieldName: 'organization_name',
    submittedValue: 'ABC Foundation',
    extractedValue: 'XYZ Relief Society',
  });
  assert(mOrgMismatch.result === 'MISMATCH', 'Different organizations produce MISMATCH');

  // Strong Identifiers: PAN Exact Match
  const mPanExact = await MatchingService.compareField({
    fieldName: 'pan',
    submittedValue: 'ABCDE1234F',
    extractedValue: 'ABCDE1234F',
  });
  assert(mPanExact.result === 'MATCH' && mPanExact.matchScore === 100, 'Exact PAN produces MATCH');

  // Strong Identifiers: PAN Mismatch (MUST NOT fuzzy match!)
  const mPanMismatch = await MatchingService.compareField({
    fieldName: 'pan',
    submittedValue: 'ABCDE1234F',
    extractedValue: 'ABCDE9999F',
  });
  assert(mPanMismatch.result === 'MISMATCH' && mPanMismatch.matchScore === 0, 'Differing PAN strictly produces MISMATCH (score = 0)');

  // Strong Identifiers: Registration Number Match
  const mRegMatch = await MatchingService.compareField({
    fieldName: 'registration_number',
    submittedValue: 'REG12345',
    extractedValue: 'REG12345',
  });
  assert(mRegMatch.result === 'MATCH', 'Exact registration number produces MATCH');

  // Strong Identifiers: Registration Number Mismatch
  const mRegMismatch = await MatchingService.compareField({
    fieldName: 'registration_number',
    submittedValue: 'REG12345',
    extractedValue: 'REG99999',
  });
  assert(mRegMismatch.result === 'MISMATCH', 'Differing registration number strictly produces MISMATCH');

  // Missing Field (Not Found, NOT marked as Mismatch)
  const mNotFound = await MatchingService.compareField({
    fieldName: 'registration_number',
    submittedValue: 'REG12345',
    extractedValue: null,
  });
  assert(mNotFound.result === 'NOT_FOUND', 'Field present in profile but missing in document produces NOT_FOUND');

  // Low Confidence Flagging
  const mLowConf = await MatchingService.compareField({
    fieldName: 'organization_name',
    submittedValue: 'ABC Foundation',
    extractedValue: 'ABC Foundation',
    ocrConfidence: 0.35, // below 0.5 threshold
  });
  assert(mLowConf.result === 'LOW_CONFIDENCE', 'Low OCR confidence (< 0.5) appropriately flags LOW_CONFIDENCE');


  // ==========================================
  // SUITE 3: Verification State Machine Tests
  // ==========================================
  console.log('\n--- Test Suite 3: Verification State Machine ---');

  assert(VerificationStateMachine.canTransition('NOT_SUBMITTED', 'DOCUMENTS_UPLOADED'), 'Can transition NOT_SUBMITTED -> DOCUMENTS_UPLOADED');
  assert(VerificationStateMachine.canTransition('DOCUMENTS_UPLOADED', 'PROCESSING'), 'Can transition DOCUMENTS_UPLOADED -> PROCESSING');
  assert(VerificationStateMachine.canTransition('PROCESSING', 'AUTO_REVIEW_READY'), 'Can transition PROCESSING -> AUTO_REVIEW_READY');
  assert(VerificationStateMachine.canTransition('AUTO_REVIEW_READY', 'NEEDS_ADMIN_REVIEW'), 'Can transition AUTO_REVIEW_READY -> NEEDS_ADMIN_REVIEW');
  assert(VerificationStateMachine.canTransition('NEEDS_ADMIN_REVIEW', 'APPROVED'), 'Can transition NEEDS_ADMIN_REVIEW -> APPROVED');
  assert(VerificationStateMachine.canTransition('NEEDS_ADMIN_REVIEW', 'NEEDS_CORRECTION'), 'Can transition NEEDS_ADMIN_REVIEW -> NEEDS_CORRECTION');
  assert(VerificationStateMachine.canTransition('NEEDS_ADMIN_REVIEW', 'REJECTED'), 'Can transition NEEDS_ADMIN_REVIEW -> REJECTED');
  assert(VerificationStateMachine.canTransition('NEEDS_CORRECTION', 'DOCUMENTS_UPLOADED'), 'Can transition NEEDS_CORRECTION -> DOCUMENTS_UPLOADED');

  // Invalid transitions must be blocked
  assert(!VerificationStateMachine.canTransition('NOT_SUBMITTED', 'APPROVED'), 'Cannot jump directly from NOT_SUBMITTED to APPROVED');
  assert(!VerificationStateMachine.canTransition('DOCUMENTS_UPLOADED', 'APPROVED'), 'Cannot jump directly from DOCUMENTS_UPLOADED to APPROVED without Admin review');


  // ==========================================
  // SUITE 4: Security & File Service Tokens
  // ==========================================
  console.log('\n--- Test Suite 4: Security & Private Storage Tokens ---');

  const sampleToken = FileService.generateSignedDocToken({
    documentId: 42,
    ngoId: 10,
    userId: 5,
    role: 'ADMIN',
  });
  assert(typeof sampleToken === 'string' && sampleToken.length > 20, 'Signed document token generated');

  const verifiedPayload = FileService.verifySignedDocToken(sampleToken);
  assert(verifiedPayload !== null && verifiedPayload.documentId === 42 && verifiedPayload.role === 'ADMIN', 'Signed token decodes and verifies accurately');

  const invalidTokenResult = FileService.verifySignedDocToken('invalid.garbage.token');
  assert(invalidTokenResult === null, 'Tampered/invalid signed token correctly rejected');


  // ==========================================
  // SUITE 5: Full Database Workflow Test
  // ==========================================
  console.log('\n--- Test Suite 5: End-to-End NGO Verification DB Workflow ---');

  const uniqueEmail = `verif_test_ngo_${Date.now()}@example.com`;
  const pwdHash = await bcrypt.hash('Secret123', 10);

  // 1. Create NGO user and profile with PAN
  const testUser = await prisma.users.create({
    data: {
      full_name: 'Test NGO Director',
      email: uniqueEmail,
      password_hash: pwdHash,
      role: user_role.NGO,
      is_active: true,
      is_verified: false,
    },
  });

  const testNgo = await prisma.ngos.create({
    data: {
      user_id: testUser.user_id,
      ngo_name: 'Sahay Foundation Society',
      registration_number: `REG_${Date.now()}`,
      pan: 'ABCDE1234F',
      contact_person: 'Test Director',
      email: uniqueEmail,
      city_id: 1,
      address: '101 Civil Lines, Lucknow',
      verification_status: 'PENDING',
    },
  });

  assert(!!testNgo && testNgo.pan === 'ABCDE1234F', 'Created test NGO profile with PAN and REG numbers');

  // 2. Initialize verification record
  const verif = await VerificationService.getOrCreateVerification(testNgo.ngo_id);
  assert(verif.status === 'NOT_SUBMITTED', 'Initial verification status is NOT_SUBMITTED');

  // 3. Admin user setup for reviews
  let admin = await prisma.users.findFirst({ where: { role: user_role.ADMIN } });
  if (!admin) {
    admin = await prisma.users.create({
      data: {
        full_name: 'Admin Verifier',
        email: `admin_${Date.now()}@sahay.org`,
        password_hash: pwdHash,
        role: user_role.ADMIN,
        is_active: true,
        is_verified: true,
      },
    });
  }

  // 4. Test state transition to NEEDS_ADMIN_REVIEW
  await prisma.ngo_doc_verification.update({
    where: { verification_id: verif.verification_id },
    data: { status: 'NEEDS_ADMIN_REVIEW' },
  });

  // 5. Test Admin request correction
  const correctionResult = await VerificationService.adminRequestCorrection(
    verif.verification_id,
    admin.user_id,
    'Please re-upload a clearer copy of your Registration Certificate with seal visible.'
  );
  assert(correctionResult.status === 'NEEDS_CORRECTION', 'Admin successfully requested correction; status is NEEDS_CORRECTION');

  // 6. Test NGO re-submits after correction
  await prisma.ngo_doc_verification.update({
    where: { verification_id: verif.verification_id },
    data: { status: 'DOCUMENTS_UPLOADED' },
  });
  await prisma.ngo_doc_verification.update({
    where: { verification_id: verif.verification_id },
    data: { status: 'NEEDS_ADMIN_REVIEW' },
  });

  // 7. Admin final approval
  const approveResult = await VerificationService.adminApprove(
    verif.verification_id,
    admin.user_id,
    'All documents verified and consistent with official records.'
  );
  assert(approveResult.status === 'APPROVED', 'Verification status transitioned to APPROVED');

  // 8. Verify NGO and User verified status in database
  const updatedNgo = await prisma.ngos.findUnique({ where: { ngo_id: testNgo.ngo_id } });
  const updatedUser = await prisma.users.findUnique({ where: { user_id: testUser.user_id } });
  assert(updatedNgo?.verification_status === 'MANUALLY_VERIFIED', 'NGO verification_status updated to MANUALLY_VERIFIED');
  assert(updatedUser?.is_verified === true, 'NGO user account marked is_verified = true');

  // 9. Audit Log validation
  const auditLogs = await prisma.ngo_verification_audit_log.findMany({
    where: { verification_id: verif.verification_id },
  });
  assert(auditLogs.length >= 3, `Complete audit log history persisted (count: ${auditLogs.length})`);

  console.log(`\n🎉 Verification Test Suite Finished: ${passed} PASSED, ${failed} FAILED\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerificationTests()
  .catch((err) => {
    console.error('Fatal error in verification test suite:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
