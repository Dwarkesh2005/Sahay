import { prisma } from './db';
import bcrypt from 'bcryptjs';
import { user_role, verification_status, service_type, request_type } from '@prisma/client';

async function seed() {
  console.log('🌱 Seeding Sahay database...\n');

  // 1. Seed Cities
  const citiesData = [
    { city_name: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh' },
    { city_name: 'Patna', district: 'Patna', state: 'Bihar' },
    { city_name: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh' },
    { city_name: 'Ranchi', district: 'Ranchi', state: 'Jharkhand' },
    { city_name: 'New Delhi', district: 'New Delhi', state: 'Delhi' },
    { city_name: 'Mumbai', district: 'Mumbai', state: 'Maharashtra' },
    { city_name: 'Bengaluru', district: 'Bengaluru', state: 'Karnataka' },
    { city_name: 'Kolkata', district: 'Kolkata', state: 'West Bengal' },
    { city_name: 'Jaipur', district: 'Jaipur', state: 'Rajasthan' },
    { city_name: 'Hyderabad', district: 'Hyderabad', state: 'Telangana' }
  ];

  for (const city of citiesData) {
    await prisma.cities.upsert({
      where: {
        city_name_district_state: {
          city_name: city.city_name,
          district: city.district,
          state: city.state
        }
      },
      update: {},
      create: city
    });
  }
  const cities = await prisma.cities.findMany();
  const cityMap = new Map(cities.map(c => [c.city_name, c.city_id]));
  console.log(`✅ Cities seeded: ${cities.length}`);

  // 2. Seed Admin User
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const admin = await prisma.users.upsert({
    where: { email: 'admin@sahay.org' },
    update: {},
    create: {
      full_name: 'Sahay Admin',
      email: 'admin@sahay.org',
      phone_number: '9000000001',
      password_hash: adminPasswordHash,
      role: user_role.ADMIN,
      city_id: cityMap.get('New Delhi')!,
      is_active: true,
      is_verified: true
    }
  });
  console.log(`✅ Admin user seeded: ${admin.email}`);

  // 3. Seed NGO accounts
  const ngoPasswordHash = await bcrypt.hash('Ngo@12345', 10);

  const ngosData = [
    {
      fullName: 'Asha Foundation',
      email: 'asha@sahay.org',
      phone: '9100000001',
      city: 'Lucknow',
      ngoName: 'Asha Foundation',
      regNumber: 'REG-UP-2024-001',
      darpanId: 'UP/2024/001',
      description: 'Asha Foundation provides food, shelter, and medical assistance to migrant workers and underprivileged families in the Lucknow region. We operate community kitchens and emergency shelters.',
      address: '23 Hazratganj Road, Lucknow, UP 226001',
      services: [service_type.FOOD, service_type.SHELTER, service_type.MEDICAL],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'Hope Foundation',
      email: 'hope@sahay.org',
      phone: '9100000002',
      city: 'Lucknow',
      ngoName: 'Hope Foundation',
      regNumber: 'REG-UP-2024-002',
      darpanId: 'UP/2024/002',
      description: 'Hope Foundation focuses on employment training, skill development, and job placement for migrant communities. We also provide legal guidance for labor disputes.',
      address: '45 Gomti Nagar, Lucknow, UP 226010',
      services: [service_type.EMPLOYMENT, service_type.LEGAL, service_type.GUIDANCE],
      verified: verification_status.MANUALLY_VERIFIED
    },
    {
      fullName: 'Sahara Health Trust',
      email: 'sahara@sahay.org',
      phone: '9100000003',
      city: 'Patna',
      ngoName: 'Sahara Health Trust',
      regNumber: 'REG-BR-2024-001',
      darpanId: 'BR/2024/001',
      description: 'Sahara Health Trust runs free medical clinics, mental health counseling, and ambulance services for underserved migrant populations across Bihar.',
      address: '12 Gandhi Maidan, Patna, Bihar 800001',
      services: [service_type.MEDICAL, service_type.GUIDANCE],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'Navjeevan Sewa Sansthan',
      email: 'navjeevan@sahay.org',
      phone: '9100000004',
      city: 'New Delhi',
      ngoName: 'Navjeevan Sewa Sansthan',
      regNumber: 'REG-DL-2024-001',
      darpanId: 'DL/2024/001',
      description: 'Navjeevan operates night shelters, dry ration distribution points, and emergency accommodation centers across Delhi NCR for homeless and migrant workers.',
      address: '78 Chandni Chowk, New Delhi 110006',
      services: [service_type.FOOD, service_type.SHELTER, service_type.EMPLOYMENT],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'Shakti Women Foundation',
      email: 'shakti@sahay.org',
      phone: '9100000005',
      city: 'Mumbai',
      ngoName: 'Shakti Women Foundation',
      regNumber: 'REG-MH-2024-001',
      darpanId: 'MH/2024/001',
      description: 'Shakti Women Foundation provides education, legal aid, and shelter support for women and children in vulnerable situations. We operate safe houses and vocational training centers.',
      address: '34 Andheri East, Mumbai, MH 400069',
      services: [service_type.EDUCATION, service_type.LEGAL, service_type.SHELTER],
      verified: verification_status.CONTACT_VERIFIED
    },
    {
      fullName: 'Kiran Education Trust',
      email: 'kiran@sahay.org',
      phone: '9100000006',
      city: 'Varanasi',
      ngoName: 'Kiran Education Trust',
      regNumber: 'REG-UP-2024-003',
      darpanId: 'UP/2024/003',
      description: 'Kiran Education Trust provides free schooling, adult literacy programs, and digital skills training for migrant children and adults in Varanasi.',
      address: '56 Lanka, Varanasi, UP 221005',
      services: [service_type.EDUCATION, service_type.GUIDANCE],
      verified: verification_status.MANUALLY_VERIFIED
    },
    {
      fullName: 'Disha Livelihood Support',
      email: 'disha@sahay.org',
      phone: '9100000007',
      city: 'Bengaluru',
      ngoName: 'Disha Livelihood Support',
      regNumber: 'REG-KA-2024-001',
      darpanId: 'KA/2024/001',
      description: 'Disha focuses on providing employment opportunities, skills training, and daily wage work connections for inter-state migrant laborers in Bengaluru.',
      address: '22 Koramangala, Bengaluru, KA 560034',
      services: [service_type.EMPLOYMENT, service_type.FOOD, service_type.GUIDANCE],
      verified: verification_status.PENDING
    },
    {
      fullName: 'Roti Bank Kolkata',
      email: 'rotibank@sahay.org',
      phone: '9100000008',
      city: 'Kolkata',
      ngoName: 'Roti Bank Kolkata',
      regNumber: 'REG-WB-2024-001',
      darpanId: 'WB/2024/001',
      description: 'Roti Bank collects surplus food from restaurants and hotels and distributes it to hungry and homeless people across Kolkata. We also run community kitchens.',
      address: '90 Park Street, Kolkata, WB 700016',
      services: [service_type.FOOD, service_type.OTHER],
      verified: verification_status.PENDING
    }
  ];

  for (const ngoData of ngosData) {
    const existingUser = await prisma.users.findUnique({ where: { email: ngoData.email } });
    if (existingUser) {
      console.log(`  ↳ NGO user ${ngoData.email} already exists, skipping`);
      continue;
    }

    const user = await prisma.users.create({
      data: {
        full_name: ngoData.fullName,
        email: ngoData.email,
        phone_number: ngoData.phone,
        password_hash: ngoPasswordHash,
        role: user_role.NGO,
        city_id: cityMap.get(ngoData.city)!,
        is_active: true,
        is_verified: ngoData.verified !== verification_status.PENDING
      }
    });

    const ngo = await prisma.ngos.create({
      data: {
        user_id: user.user_id,
        ngo_name: ngoData.ngoName,
        registration_number: ngoData.regNumber,
        ngo_darpan_id: ngoData.darpanId,
        contact_person: ngoData.fullName,
        phone_number: ngoData.phone,
        email: ngoData.email,
        city_id: cityMap.get(ngoData.city)!,
        address: ngoData.address,
        description: ngoData.description,
        verification_status: ngoData.verified
      }
    });

    // Add services
    for (const svc of ngoData.services) {
      await prisma.ngo_services.create({
        data: { ngo_id: ngo.ngo_id, service: svc }
      });
    }

    // If verified, add verification record
    if (ngoData.verified !== verification_status.PENDING) {
      await prisma.ngo_verification.create({
        data: {
          ngo_id: ngo.ngo_id,
          verification_method: ngoData.verified,
          verified_by: 'System Seed',
          remarks: 'Initial seed verification'
        }
      });
    }

    console.log(`  ✅ NGO seeded: ${ngoData.ngoName} (${ngoData.city}) [${ngoData.verified}]`);
  }

  // 4. Seed Migrant Users
  const migrantPasswordHash = await bcrypt.hash('User@12345', 10);

  const migrantsData = [
    { name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '9200000001', city: 'Lucknow' },
    { name: 'Sunita Devi', email: 'sunita@example.com', phone: '9200000002', city: 'Patna' },
    { name: 'Amit Singh', email: 'amit@example.com', phone: '9200000003', city: 'New Delhi' },
    { name: 'Priya Sharma', email: 'priya@example.com', phone: '9200000004', city: 'Mumbai' },
    { name: 'Ravi Yadav', email: 'ravi@example.com', phone: '9200000005', city: 'Varanasi' }
  ];

  for (const migrant of migrantsData) {
    const existing = await prisma.users.findUnique({ where: { email: migrant.email } });
    if (existing) {
      console.log(`  ↳ Migrant ${migrant.email} already exists, skipping`);
      continue;
    }

    await prisma.users.create({
      data: {
        full_name: migrant.name,
        email: migrant.email,
        phone_number: migrant.phone,
        password_hash: migrantPasswordHash,
        role: user_role.MIGRANT,
        city_id: cityMap.get(migrant.city)!,
        is_active: true,
        is_verified: true
      }
    });
    console.log(`  ✅ Migrant seeded: ${migrant.name} (${migrant.city})`);
  }

  // 5. Seed sample Help Requests
  const rajesh = await prisma.users.findUnique({ where: { email: 'rajesh@example.com' } });
  const sunita = await prisma.users.findUnique({ where: { email: 'sunita@example.com' } });
  const amit = await prisma.users.findUnique({ where: { email: 'amit@example.com' } });

  if (rajesh) {
    const existing = await prisma.help_requests.findFirst({
      where: { user_id: rajesh.user_id, title: 'Need urgent medical help' }
    });
    if (!existing) {
      await prisma.help_requests.create({
        data: {
          user_id: rajesh.user_id,
          request_type: request_type.MEDICAL,
          title: 'Need urgent medical help',
          description: 'I am a construction worker who recently arrived in Lucknow. I am experiencing severe chest pain and need immediate medical assistance. I do not have any medical insurance or funds for hospital treatment.',
          city_id: cityMap.get('Lucknow')!,
          status: 'PENDING'
        }
      });
      console.log('  ✅ Help request seeded: Medical (Rajesh, Lucknow)');
    }
  }

  if (sunita) {
    const existing = await prisma.help_requests.findFirst({
      where: { user_id: sunita.user_id, title: 'Food and ration needed for family' }
    });
    if (!existing) {
      await prisma.help_requests.create({
        data: {
          user_id: sunita.user_id,
          request_type: request_type.FOOD,
          title: 'Food and ration needed for family',
          description: 'I am a migrant worker from rural Bihar. My family of 5 has not had proper food for 2 days. We need dry rations and access to a community kitchen nearby.',
          city_id: cityMap.get('Patna')!,
          status: 'PENDING'
        }
      });
      console.log('  ✅ Help request seeded: Food (Sunita, Patna)');
    }
  }

  if (amit) {
    const existing = await prisma.help_requests.findFirst({
      where: { user_id: amit.user_id, title: 'Need shelter for the night' }
    });
    if (!existing) {
      await prisma.help_requests.create({
        data: {
          user_id: amit.user_id,
          request_type: request_type.SHELTER,
          title: 'Need shelter for the night',
          description: 'I just arrived in Delhi from UP looking for work. I need a safe place to stay for a few nights while I find employment. Any nearby night shelter information would help.',
          city_id: cityMap.get('New Delhi')!,
          status: 'PENDING'
        }
      });
      console.log('  ✅ Help request seeded: Shelter (Amit, Delhi)');
    }
  }

  console.log('\n🎉 Sahay database seeding complete!');
  console.log('\n📋 Test Accounts:');
  console.log('  Admin:   admin@sahay.org / Admin@12345');
  console.log('  NGO:     asha@sahay.org / Ngo@12345');
  console.log('  Migrant: rajesh@example.com / User@12345');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
