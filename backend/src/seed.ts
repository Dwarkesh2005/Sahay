import { prisma } from './db';
import bcrypt from 'bcryptjs';
import { user_role, verification_status, service_type, request_type } from '@prisma/client';

async function seed() {
  console.log('🌱 Seeding Sahay database with Gujarat cities and real NGOs...\n');

  // 1. Seed Cities (Strictly the 10 selected Gujarat cities)
  const citiesData = [
    { city_name: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat' },
    { city_name: 'Surat', district: 'Surat', state: 'Gujarat' },
    { city_name: 'Vadodara', district: 'Vadodara', state: 'Gujarat' },
    { city_name: 'Rajkot', district: 'Rajkot', state: 'Gujarat' },
    { city_name: 'Bhavnagar', district: 'Bhavnagar', state: 'Gujarat' },
    { city_name: 'Jamnagar', district: 'Jamnagar', state: 'Gujarat' },
    { city_name: 'Gandhinagar', district: 'Gandhinagar', state: 'Gujarat' },
    { city_name: 'Anand', district: 'Anand', state: 'Gujarat' },
    { city_name: 'Bharuch', district: 'Bharuch', state: 'Gujarat' },
    { city_name: 'Vapi', district: 'Valsad', state: 'Gujarat' }
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
  const cities = await prisma.cities.findMany({
    where: {
      city_name: {
        in: citiesData.map(c => c.city_name)
      }
    }
  });
  const cityMap = new Map(cities.map(c => [c.city_name, c.city_id]));
  console.log(`✅ Cities seeded: ${cities.length}`);

  // 2. Seed Admin User (Default in Gandhinagar capital)
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const gandhinagarId = cityMap.get('Gandhinagar') || cities[0].city_id;
  const admin = await prisma.users.upsert({
    where: { email: 'admin@sahay.org' },
    update: {
      city_id: gandhinagarId
    },
    create: {
      full_name: 'Sahay Admin',
      email: 'admin@sahay.org',
      phone_number: '9000000001',
      password_hash: adminPasswordHash,
      role: user_role.ADMIN,
      city_id: gandhinagarId,
      is_active: true,
      is_verified: true
    }
  });
  console.log(`✅ Admin user seeded: ${admin.email}`);

  // 3. Seed NGO accounts with real NGOs from official NIC & NGO directories
  const ngoPasswordHash = await bcrypt.hash('Ngo@12345', 10);

  const ngosData: {
    fullName: string;
    email: string;
    phone: string;
    city: string;
    ngoName: string;
    regNumber: string;
    darpanId: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    services: service_type[];
    verified: verification_status;
  }[] = [
    // 1. Ahmedabad (https://ahmedabad.nic.in/public-utility-category/ngos/)
    {
      fullName: 'Apang Manav Mandal',
      email: 'apangmanav@sahay.org',
      phone: '07926300792',
      city: 'Ahmedabad',
      ngoName: 'Apang Manav Mandal',
      regNumber: 'REG-GJ-AHM-001',
      darpanId: 'GJ/2024/00101',
      description: 'Provides rehabilitation, vocational training, shelter hostels, physiotherapy, and employment assistance for differently-abled and underprivileged individuals in Ahmedabad.',
      address: 'Opp. AMA Centre, Behind ATIRA, Dr. Vikram Sarabhai Road, Vastrapur, Ahmedabad 380015',
      latitude: 23.0338,
      longitude: 72.5360,
      services: [service_type.SHELTER, service_type.EMPLOYMENT, service_type.MEDICAL, service_type.EDUCATION],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'Saath Charitable Trust',
      email: 'saath@sahay.org',
      phone: '9100000009',
      city: 'Ahmedabad',
      ngoName: 'Saath Charitable Trust',
      regNumber: 'REG-GJ-AHM-002',
      darpanId: 'GJ/2024/00102',
      description: 'Comprehensive healthcare services, migrant livelihood support, shelter, and financial assistance to underprivileged and migrant families in Ahmedabad.',
      address: '12 CG Road, Navrangpura, Ahmedabad, Gujarat 380009',
      latitude: 23.0350,
      longitude: 72.5614,
      services: [service_type.MEDICAL, service_type.MIGRANT_SUPPORT, service_type.FINANCIAL_ASSISTANCE, service_type.FOOD],
      verified: verification_status.GOVERNMENT_VERIFIED
    },

    // 2. Surat (https://surat.nic.in/public-utility-category/ngos/)
    {
      fullName: 'Ekta Trust Surat',
      email: 'ekta@sahay.org',
      phone: '9825100001',
      city: 'Surat',
      ngoName: 'Ekta Trust',
      regNumber: 'REG-GJ-SRT-001',
      darpanId: 'GJ/2024/00201',
      description: 'Provides emergency food relief, shelter support, and community welfare aid to migrant workers across Surat industrial belts.',
      address: 'Chowk Bazar, Surat, Gujarat 395003',
      latitude: 21.2000,
      longitude: 72.8200,
      services: [service_type.FOOD, service_type.SHELTER, service_type.MIGRANT_SUPPORT],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'Nature Club Surat EERC',
      email: 'natureclub@sahay.org',
      phone: '9825100002',
      city: 'Surat',
      ngoName: 'Nature Club Surat (EERC)',
      regNumber: 'REG-GJ-SRT-002',
      darpanId: 'GJ/2024/00202',
      description: 'Community education, health guidance, environment protection, and volunteer emergency relief across Surat.',
      address: '81 Sarjan Society, Athwalines, Surat, Gujarat 395007',
      latitude: 21.1764,
      longitude: 72.8028,
      services: [service_type.EDUCATION, service_type.GUIDANCE],
      verified: verification_status.MANUALLY_VERIFIED
    },

    // 3. Vadodara (https://vadodara.nic.in/public-utility-category/ngos/)
    {
      fullName: 'United Way of Baroda',
      email: 'unitedway@sahay.org',
      phone: '02652358000',
      city: 'Vadodara',
      ngoName: 'United Way Of Baroda',
      regNumber: 'REG-GJ-BDQ-001',
      darpanId: 'GJ/2024/00301',
      description: 'Prominent social impact organization running civic welfare, medical assistance, education, and livelihood programs for low-income migrant workers in Vadodara.',
      address: '9th Floor, Sidcup Tower, Race Course Rd, Vadiwadi, Vadodara, Gujarat 390007',
      latitude: 22.3168,
      longitude: 73.1678,
      services: [service_type.MEDICAL, service_type.EDUCATION, service_type.EMPLOYMENT, service_type.MIGRANT_SUPPORT],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'Friends Society Vadodara',
      email: 'friends@sahay.org',
      phone: '02652792000',
      city: 'Vadodara',
      ngoName: 'Friends Society',
      regNumber: 'REG-GJ-BDQ-002',
      darpanId: 'GJ/2024/00302',
      description: 'Youth-driven community center offering vocational guidance, food drives, and shelter assistance to displaced migrant laborers.',
      address: 'Fatehgunj Main Rd, Near Petit Library, Jayesh Colony, Fatehgunj, Vadodara 390002',
      latitude: 22.3210,
      longitude: 73.1870,
      services: [service_type.GUIDANCE, service_type.SHELTER, service_type.FOOD],
      verified: verification_status.CONTACT_VERIFIED
    },

    // 4. Rajkot (https://rajkot.nic.in/public-utility-category/ngos/)
    {
      fullName: 'Mahila Vikas Seva Mandal',
      email: 'mahilavikas@sahay.org',
      phone: '02812454059',
      city: 'Rajkot',
      ngoName: 'Mahila Vikas Seva Mandal',
      regNumber: 'REG-GJ-RAJ-001',
      darpanId: 'GJ/2024/00401',
      description: 'Empowering migrant women and underprivileged families through skill development, legal aid, emergency food, and shelter facilities in Rajkot.',
      address: '105 Star Plaza, Phoolchhab Chowk, Rajkot, Gujarat 360001',
      latitude: 22.3000,
      longitude: 70.8022,
      services: [service_type.EMPLOYMENT, service_type.LEGAL, service_type.SHELTER, service_type.SKILL_DEVELOPMENT],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'Bharat Jan Vigyan Jatha',
      email: 'bjvjatha@sahay.org',
      phone: '02812577287',
      city: 'Rajkot',
      ngoName: 'Bharat Jan Vigyan Jatha',
      regNumber: 'REG-GJ-RAJ-002',
      darpanId: 'GJ/2024/00402',
      description: 'Public awareness, health guidance, civil rights assistance, and migrant guidance services throughout Saurashtra.',
      address: '1 Jivan Nagar, Near Brahm Samaj, Kaniya Chowk, Raiya Circle, Rajkot 360007',
      latitude: 22.2880,
      longitude: 70.7750,
      services: [service_type.GUIDANCE, service_type.LEGAL],
      verified: verification_status.MANUALLY_VERIFIED
    },

    // 5. Bhavnagar (https://ngosindia.org/gujarat/bhavnagar-ngos/)
    {
      fullName: 'PNR Society for Disabled',
      email: 'pnrsociety@sahay.org',
      phone: '02782567000',
      city: 'Bhavnagar',
      ngoName: 'Smt. P.N.R. Society for Relief and Rehabilitation of Disabled',
      regNumber: 'REG-GJ-BVN-001',
      darpanId: 'GJ/2024/00501',
      description: 'Rehabilitation, medical care, physical therapy, food aid, and vocational schooling for differently-abled and disadvantaged individuals.',
      address: 'Kaliyabid, Bhavnagar, Gujarat 364002',
      latitude: 21.7580,
      longitude: 72.1380,
      services: [service_type.MEDICAL, service_type.EDUCATION, service_type.SHELTER, service_type.FOOD],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'Shaishav Child Rights Trust',
      email: 'shaishav@sahay.org',
      phone: '02782568000',
      city: 'Bhavnagar',
      ngoName: 'Shaishav Trust',
      regNumber: 'REG-GJ-BVN-002',
      darpanId: 'GJ/2024/00502',
      description: 'Dedicated to education, protection, nutrition, and child rights advocacy for children of migrant workers in Bhavnagar.',
      address: 'Near Marketing Yard, Bhavnagar, Gujarat 364001',
      latitude: 21.7645,
      longitude: 72.1519,
      services: [service_type.EDUCATION, service_type.FOOD, service_type.GUIDANCE],
      verified: verification_status.CONTACT_VERIFIED
    },

    // 6. Jamnagar (https://jamnagar.nic.in/public-utility-category/ngos/)
    {
      fullName: 'Kasturba Stri Vikas Gruh',
      email: 'kasturbastrivikasgruh@yahoo.co.in',
      phone: '02882550000',
      city: 'Jamnagar',
      ngoName: 'Kasturba Stri Vikas Gruh',
      regNumber: 'REG-GJ-JAM-001',
      darpanId: 'GJ/2024/00601',
      description: 'Historic institution providing secure residential shelter, vocational employment, healthcare, and education for women and children in distress.',
      address: 'Vikas Gruh Road, Jamnagar, Gujarat 361008',
      latitude: 22.4707,
      longitude: 70.0577,
      services: [service_type.SHELTER, service_type.EMPLOYMENT, service_type.FOOD, service_type.EDUCATION],
      verified: verification_status.GOVERNMENT_VERIFIED
    },

    // 7. Gandhinagar (https://gandhinagar.nic.in/public-utility-category/ngos/)
    {
      fullName: 'Shree Pragati Sarvjanik Trust',
      email: 'pragatitrust@sahay.org',
      phone: '07923213216',
      city: 'Gandhinagar',
      ngoName: 'Shree Pragati Sarvjanik Trust',
      regNumber: 'REG-GJ-GND-001',
      darpanId: 'GJ/2024/00701',
      description: 'Promotes education, skill development, medical welfare camps, and emergency dry ration support in Gandhinagar and surrounding rural clusters.',
      address: '218/A Super Mall-1, Infocity, GH-0, Gandhinagar, Gujarat 382007',
      latitude: 23.2156,
      longitude: 72.6369,
      services: [service_type.EDUCATION, service_type.MEDICAL, service_type.FOOD, service_type.SKILL_DEVELOPMENT],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'Udgam Charitable Trust',
      email: 'info@udgam.org',
      phone: '9427380788',
      city: 'Gandhinagar',
      ngoName: 'Udgam Charitable Trust',
      regNumber: 'REG-GJ-GND-002',
      darpanId: 'GJ/2024/00702',
      description: 'Focuses on livelihood generation, community counseling, labor rights, and legal guidance for migrant communities.',
      address: 'Plot No 818, Near Government School, Sector-8, Gandhinagar, Gujarat 382007',
      latitude: 23.2200,
      longitude: 72.6500,
      services: [service_type.EMPLOYMENT, service_type.GUIDANCE, service_type.LEGAL],
      verified: verification_status.MANUALLY_VERIFIED
    },

    // 8. Anand (https://anand.nic.in/public-utility-category/ngos/)
    {
      fullName: 'National Association for the Blind Anand',
      email: 'nabanand@gmail.com',
      phone: '9499613337',
      city: 'Anand',
      ngoName: 'National Association for the Blind (NAB) Anand',
      regNumber: 'REG-GJ-AND-001',
      darpanId: 'GJ/2024/00801',
      description: 'Healthcare rehabilitation, free eye checkups, vocational training, and food assistance for differently-abled and low-income residents.',
      address: 'D.J. Hospital, Opp. Panchayat Hospital, Nana Bazar, V.V. Nagar, Anand 388120',
      latitude: 22.5539,
      longitude: 72.9238,
      services: [service_type.MEDICAL, service_type.EDUCATION, service_type.FOOD],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'New Jalaram Seva Trust Anand',
      email: 'jalaram@sahay.org',
      phone: '8000237557',
      city: 'Anand',
      ngoName: 'New Jalaram Seva Trust',
      regNumber: 'REG-GJ-AND-002',
      darpanId: 'GJ/2024/00802',
      description: 'Daily community kitchen, food packet distribution, and emergency ration relief for transient workers and homeless people.',
      address: 'Near Bhagat Singh Statue, C.P. College Road, Anand 388001',
      latitude: 22.5645,
      longitude: 72.9580,
      services: [service_type.FOOD, service_type.SHELTER],
      verified: verification_status.CONTACT_VERIFIED
    },

    // 9. Bharuch (https://bharuch.nic.in/public-utility-category/ngos/)
    {
      fullName: 'Gram Vikas Trust Bharuch',
      email: 'gvt@sahay.org',
      phone: '02642239001',
      city: 'Bharuch',
      ngoName: 'Gram Vikas Trust',
      regNumber: 'REG-GJ-BRH-001',
      darpanId: 'GJ/2024/00901',
      description: 'Empowers migrant families in Bharuch and Dahej industrial corridors with child education, skill training, healthcare checkups, and disaster relief.',
      address: 'A-18 Pushapdhan Bungalows, Bharuch H.O., Bharuch 392001',
      latitude: 21.7051,
      longitude: 72.9959,
      services: [service_type.EDUCATION, service_type.EMPLOYMENT, service_type.MEDICAL, service_type.MIGRANT_SUPPORT],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'Kalarav Charitable Trust',
      email: 'kalarav@sahay.org',
      phone: '02642252683',
      city: 'Bharuch',
      ngoName: 'Kalarav Charitable Trust',
      regNumber: 'REG-GJ-BRH-002',
      darpanId: 'GJ/2024/00902',
      description: 'Special education, medical therapy, food assistance, and social integration support for disabled and marginalized communities.',
      address: 'Modi Compound, Panch Fanas, Bharuch 392001',
      latitude: 21.7010,
      longitude: 72.9880,
      services: [service_type.MEDICAL, service_type.EDUCATION, service_type.FOOD],
      verified: verification_status.MANUALLY_VERIFIED
    },

    // 10. Vapi (Valsad district: https://ngosindia.org/gujarat/valsad-ngos/)
    {
      fullName: 'Maa Foundation Vapi',
      email: 'maafoundation@sahay.org',
      phone: '9825100005',
      city: 'Vapi',
      ngoName: 'Maa Foundation',
      regNumber: 'REG-GJ-VAP-001',
      darpanId: 'GJ/2024/01001',
      description: 'Grassroots education, school development, vocational upskilling, and youth training programs across Vapi industrial belts.',
      address: 'Shri G.M. Bilakhia Stadium, Opp. Bilakhia House, Muktanand Marg, Chala, Vapi, Valsad 396191',
      latitude: 20.3725,
      longitude: 72.9042,
      services: [service_type.EDUCATION, service_type.SKILL_DEVELOPMENT, service_type.EMPLOYMENT],
      verified: verification_status.GOVERNMENT_VERIFIED
    },
    {
      fullName: 'Ashapura Manav Kalyan Trust',
      email: 'ashapura@sahay.org',
      phone: '9825100006',
      city: 'Vapi',
      ngoName: 'Ashapura Manav Kalyan Trust',
      regNumber: 'REG-GJ-VAP-002',
      darpanId: 'GJ/2024/01002',
      description: 'Medical camps, emergency migrant shelter, daily meals, and community welfare aid for industrial laborers in Vapi and surrounding villages.',
      address: 'G-1 Jafran App, Kanchan Janga Society, Vapi, Valsad 396191',
      latitude: 20.3800,
      longitude: 72.9100,
      services: [service_type.FOOD, service_type.SHELTER, service_type.MEDICAL],
      verified: verification_status.CONTACT_VERIFIED
    }
  ];

  for (const ngoData of ngosData) {
    const existingUser = await prisma.users.findUnique({ where: { email: ngoData.email } });
    let userId = existingUser?.user_id;

    if (!existingUser) {
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
      userId = user.user_id;
    }

    const existingNgo = await prisma.ngos.findFirst({ where: { user_id: userId } });
    let ngoId = existingNgo?.ngo_id;

    if (!existingNgo) {
      const ngo = await prisma.ngos.create({
        data: {
          user_id: userId!,
          ngo_name: ngoData.ngoName,
          registration_number: ngoData.regNumber,
          ngo_darpan_id: ngoData.darpanId,
          contact_person: ngoData.fullName,
          phone_number: ngoData.phone,
          email: ngoData.email,
          city_id: cityMap.get(ngoData.city)!,
          address: ngoData.address,
          latitude: ngoData.latitude ?? null,
          longitude: ngoData.longitude ?? null,
          description: ngoData.description,
          verification_status: ngoData.verified
        }
      });
      ngoId = ngo.ngo_id;

      // Add services
      for (const svc of ngoData.services) {
        await prisma.ngo_services.create({
          data: { ngo_id: ngoId, service: svc }
        });
      }

      // If verified, add verification record
      if (ngoData.verified !== verification_status.PENDING) {
        await prisma.ngo_verification.create({
          data: {
            ngo_id: ngoId,
            verification_method: ngoData.verified,
            verified_by: 'System Seed',
            remarks: 'Official Government NIC / NGOsIndia Verified Directory'
          }
        });
      }
      console.log(`  ✅ NGO seeded: ${ngoData.ngoName} (${ngoData.city}) [${ngoData.verified}]`);
    } else {
      console.log(`  ↳ NGO ${ngoData.ngoName} already exists, skipping`);
    }
  }

  // 4. Seed Migrant Users across the Gujarat cities
  const migrantPasswordHash = await bcrypt.hash('User@12345', 10);

  const migrantsData = [
    { name: 'Meera Patel', email: 'meera@example.com', phone: '9200000006', city: 'Ahmedabad' },
    { name: 'Karan Joshi', email: 'karan@example.com', phone: '9200000007', city: 'Vadodara' },
    { name: 'Ramesh Solanki', email: 'ramesh@example.com', phone: '9200000008', city: 'Surat' },
    { name: 'Kavita Makwana', email: 'kavita@example.com', phone: '9200000009', city: 'Rajkot' },
    { name: 'Paresh Parmar', email: 'paresh@example.com', phone: '9200000010', city: 'Bhavnagar' },
    { name: 'Gopal Rathod', email: 'gopal@example.com', phone: '9200000011', city: 'Jamnagar' },
    { name: 'Dinesh Vaghela', email: 'dinesh@example.com', phone: '9200000012', city: 'Gandhinagar' },
    { name: 'Sanjay Thakor', email: 'sanjay@example.com', phone: '9200000013', city: 'Anand' },
    { name: 'Chetan Vasava', email: 'chetan@example.com', phone: '9200000014', city: 'Bharuch' },
    { name: 'Manoj Patel', email: 'manoj@example.com', phone: '9200000015', city: 'Vapi' }
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

  // 5. Seed sample Help Requests in these cities
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const meera = await prisma.users.findUnique({ where: { email: 'meera@example.com' } });
  const karan = await prisma.users.findUnique({ where: { email: 'karan@example.com' } });
  const ramesh = await prisma.users.findUnique({ where: { email: 'ramesh@example.com' } });
  const chetan = await prisma.users.findUnique({ where: { email: 'chetan@example.com' } });

  const seedRequests = [
    {
      user: meera,
      title: 'Medical treatment for child',
      description: 'My 4-year-old child has a high fever and needs medical attention. We recently migrated to Ahmedabad from a rural area and cannot afford hospital fees. Looking for free or subsidized medical treatment.',
      type: request_type.MEDICAL,
      city: 'Ahmedabad',
      urgency: 'EMERGENCY'
    },
    {
      user: karan,
      title: 'Employment and temporary accommodation',
      description: 'I am a migrant worker looking for employment and temporary shelter in Vadodara. I have experience in construction and factory work. I need a job placement and a safe place to stay while I settle.',
      type: request_type.EMPLOYMENT,
      city: 'Vadodara',
      urgency: 'MEDIUM'
    },
    {
      user: ramesh,
      title: 'Food ration and emergency shelter in Surat',
      description: 'Recently migrated textile worker family in need of dry ration kits and temporary accommodation assistance.',
      type: request_type.FOOD,
      city: 'Surat',
      urgency: 'HIGH'
    },
    {
      user: chetan,
      title: 'Livelihood placement in Bharuch chemical industrial estate',
      description: 'Experienced in industrial utility and logistics work, seeking placement and legal guidance.',
      type: request_type.EMPLOYMENT,
      city: 'Bharuch',
      urgency: 'MEDIUM'
    }
  ];

  for (const sr of seedRequests) {
    if (!sr.user) continue;
    const existing = await prisma.help_requests.findFirst({
      where: { user_id: sr.user.user_id, title: sr.title }
    });
    if (!existing) {
      await prisma.help_requests.create({
        data: {
          user_id: sr.user.user_id,
          request_type: sr.type,
          title: sr.title,
          description: sr.description,
          city_id: cityMap.get(sr.city)!,
          status: 'PENDING',
          urgency: sr.urgency,
          created_at: now,
          expires_at: sevenDaysFromNow
        }
      });
      console.log(`  ✅ Help request seeded: ${sr.type} (${sr.user.full_name}, ${sr.city})`);
    }
  }

  console.log('\n🎉 Sahay Gujarat Database Seeding Complete!');
  console.log('\n📋 Demo Accounts:');
  console.log('  Admin:   admin@sahay.org / Admin@12345 (Gandhinagar)');
  console.log('  NGO:     apangmanav@sahay.org / Ngo@12345 (Ahmedabad)');
  console.log('  NGO:     saath@sahay.org / Ngo@12345 (Ahmedabad)');
  console.log('  NGO:     ekta@sahay.org / Ngo@12345 (Surat)');
  console.log('  NGO:     unitedway@sahay.org / Ngo@12345 (Vadodara)');
  console.log('  NGO:     mahilavikas@sahay.org / Ngo@12345 (Rajkot)');
  console.log('  NGO:     pnrsociety@sahay.org / Ngo@12345 (Bhavnagar)');
  console.log('  NGO:     kasturbastrivikasgruh@yahoo.co.in / Ngo@12345 (Jamnagar)');
  console.log('  NGO:     pragatitrust@sahay.org / Ngo@12345 (Gandhinagar)');
  console.log('  NGO:     nabanand@gmail.com / Ngo@12345 (Anand)');
  console.log('  NGO:     gvt@sahay.org / Ngo@12345 (Bharuch)');
  console.log('  NGO:     maafoundation@sahay.org / Ngo@12345 (Vapi)');
  console.log('  Migrant: meera@example.com / User@12345 (Ahmedabad)');
  console.log('  Migrant: karan@example.com / User@12345 (Vadodara)');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
