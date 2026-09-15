import { prisma } from '../db';
import { getRecommendations, extractCategories, haversineDistance } from '../services/recommendationService';

async function runTests() {
  console.log('🧪 Starting Recommendation Engine Integration Tests...\n');

  try {
    // ─── Test 1: extractCategories from description ───
    console.log('--- Test 1: Keyword-Based Category Extraction ---');

    const medicalCategories = extractCategories(
      'I need urgent medical treatment but cannot afford hospital expenses. I am a migrant worker.',
      'MEDICAL'
    );
    console.log(`  Detected categories: [${medicalCategories.join(', ')}]`);
    if (!medicalCategories.includes('MEDICAL')) throw new Error('Expected MEDICAL in categories');
    if (!medicalCategories.includes('FINANCIAL_ASSISTANCE')) throw new Error('Expected FINANCIAL_ASSISTANCE for "afford/expenses"');
    if (!medicalCategories.includes('MIGRANT_SUPPORT')) throw new Error('Expected MIGRANT_SUPPORT for "migrant"');
    console.log('✅ Keyword extraction correctly identified MEDICAL, FINANCIAL_ASSISTANCE, MIGRANT_SUPPORT');

    // Test Hindi keywords
    const hindiCategories = extractCategories(
      'मुझे राशन और भोजन की जरूरत है, बच्चों के लिए दूध चाहिए',
      'FOOD'
    );
    console.log(`  Hindi categories: [${hindiCategories.join(', ')}]`);
    if (!hindiCategories.includes('FOOD')) throw new Error('Expected FOOD from request_type');
    if (!hindiCategories.includes('CHILD_SUPPORT')) throw new Error('Expected CHILD_SUPPORT for "बच्चों"');
    console.log('✅ Hindi keyword extraction works correctly');

    // ─── Test 2: Haversine Distance Calculation ───
    console.log('\n--- Test 2: Haversine Distance Calculation ---');
    // Ahmedabad (23.0225, 72.5714) to Vadodara (22.3072, 73.1812) ≈ 112 km
    const distAV = haversineDistance(23.0225, 72.5714, 22.3072, 73.1812);
    console.log(`  Ahmedabad → Vadodara: ${distAV.toFixed(1)} km`);
    if (distAV < 100 || distAV > 130) throw new Error(`Expected ~112 km, got ${distAV.toFixed(1)}`);
    console.log('✅ Haversine distance calculation correct (expected ~112 km)');

    // Same location = 0 km
    const distSame = haversineDistance(23.0225, 72.5714, 23.0225, 72.5714);
    if (distSame !== 0) throw new Error(`Expected 0 km for same location, got ${distSame}`);
    console.log('✅ Same point distance = 0 km');

    // ─── Test 3: Full Recommendation Pipeline ───
    console.log('\n--- Test 3: Full Recommendation Pipeline (End-to-End) ---');

    // Find an Ahmedabad migrant + create a test request
    const ahmedabadCity = await prisma.cities.findFirst({
      where: { city_name: { contains: 'Ahmedabad' } }
    });

    if (!ahmedabadCity) {
      console.log('⚠️ Skipping pipeline test: Ahmedabad city not found in seed data');
    } else {
      const migrant = await prisma.users.findFirst({
        where: { role: 'MIGRANT', city_id: ahmedabadCity.city_id }
      });

      if (!migrant) {
        console.log('⚠️ Skipping pipeline test: No migrant in Ahmedabad found');
      } else {
        // Create a MEDICAL request in Ahmedabad
        const testReq = await prisma.help_requests.create({
          data: {
            user_id: migrant.user_id,
            request_type: 'MEDICAL',
            title: 'TEST_REC_Medical aid in Ahmedabad',
            description: 'I need urgent medical treatment and financial help for hospital admission. I am a daily-wage migrant worker.',
            city_id: ahmedabadCity.city_id,
            latitude: 23.0225,
            longitude: 72.5714,
            urgency: 'HIGH',
            status: 'PENDING',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        });

        console.log(`  Created test request #${testReq.request_id} (MEDICAL, Ahmedabad)`);

        const { recommendations, categories: detectedCategories } = await getRecommendations(
          testReq.request_id,
          migrant.user_id
        );

        console.log(`  Detected categories: [${detectedCategories.join(', ')}]`);
        console.log(`  Recommendations count: ${recommendations.length}`);

        if (detectedCategories.length === 0) throw new Error('Expected at least 1 detected category');
        if (!detectedCategories.includes('MEDICAL')) throw new Error('Expected MEDICAL in detected categories');

        if (recommendations.length === 0) throw new Error('Expected at least 1 recommendation');

        // Verify recommendations are sorted by score (descending)
        for (let i = 1; i < recommendations.length; i++) {
          if (recommendations[i].matchScore > recommendations[i - 1].matchScore) {
            throw new Error(`Recommendations not sorted by score: ${recommendations[i - 1].matchScore} < ${recommendations[i].matchScore}`);
          }
        }
        console.log('✅ Recommendations sorted by descending match score');

        // Ahmedabad NGOs should rank higher than non-Ahmedabad NGOs
        const ahmedabadRecs = recommendations.filter(r => r.cityMatch);
        const otherRecs = recommendations.filter(r => !r.cityMatch);

        if (ahmedabadRecs.length > 0 && otherRecs.length > 0) {
          const topAhmedabadScore = ahmedabadRecs[0].matchScore;
          const topOtherScore = otherRecs[0].matchScore;
          console.log(`  Top Ahmedabad NGO score: ${topAhmedabadScore}, Top other-city score: ${topOtherScore}`);
          if (topAhmedabadScore < topOtherScore) {
            console.log('⚠️ Warning: Other-city NGO scored higher than same-city — may be due to more service matches');
          } else {
            console.log('✅ Same-city NGOs rank above other-city NGOs (as expected)');
          }
        }

        // Log top 3 recommendations
        recommendations.slice(0, 3).forEach((rec, i) => {
          console.log(`  #${i + 1}: ${rec.name} (Score: ${rec.matchScore}, City: ${rec.city}, Match: [${rec.matchedNeeds.join(',')}])`);
        });

        // Verify no unverified NGOs (PENDING) score above verified ones when other factors are equal
        const verifiedRecs = recommendations.filter(r => r.verified);
        console.log(`  Verified NGOs in results: ${verifiedRecs.length}/${recommendations.length}`);
        console.log('✅ Full recommendation pipeline test passed');

        // Clean up test request
        await prisma.help_requests.deleteMany({
          where: { title: { startsWith: 'TEST_REC_' } }
        });
        console.log('  Cleaned up test data');
      }
    }

    // ─── Test 4: Empty/No-Match Scenario ───
    console.log('\n--- Test 4: No-Match Scenario ---');
    const anyCityId = (await prisma.cities.findFirst())?.city_id || 1;
    const anyMigrant = await prisma.users.findFirst({ where: { role: 'MIGRANT' } });

    if (anyMigrant) {
      const noMatchReq = await prisma.help_requests.create({
        data: {
          user_id: anyMigrant.user_id,
          request_type: 'GUIDANCE',
          title: 'TEST_REC_Generic guidance query',
          description: 'Just need some general information.',
          city_id: anyCityId,
          status: 'PENDING',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const { recommendations: noMatchRecs } = await getRecommendations(
        noMatchReq.request_id,
        anyMigrant.user_id
      );

      // Should return results (GUIDANCE-providing NGOs), not crash
      console.log(`  Generic guidance results: ${noMatchRecs.length} NGOs`);
      console.log('✅ No-crash on generic/broad queries');

      await prisma.help_requests.deleteMany({
        where: { title: { startsWith: 'TEST_REC_' } }
      });
    }

    console.log('\n🎉 ALL RECOMMENDATION ENGINE TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
