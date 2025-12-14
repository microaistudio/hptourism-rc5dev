import { db } from '../server/db';
import { users, homestayApplications } from '../shared/schema';
import bcrypt from 'bcrypt';

async function seedMockData() {
  console.log('🌱 Seeding mock data...');

  // Hash password
  const hashedPassword = await bcrypt.hash('test123', 10);

  // Insert 3 test users
  const [owner, districtOfficer, stateOfficer] = await db.insert(users).values([
    {
      mobile: '9999999991',
      fullName: 'Property Owner Demo',
      email: 'owner@hptourism.com',
      role: 'property_owner',
      district: 'Shimla',
      aadhaarNumber: '123456789001',
      password: hashedPassword,
    },
    {
      mobile: '9999999992',
      fullName: 'District Officer Shimla',
      email: 'district@hptourism.gov.in',
      role: 'district_officer',
      district: 'Shimla',
      aadhaarNumber: '123456789002',
      password: hashedPassword,
    },
    {
      mobile: '9999999993',
      fullName: 'State Tourism Officer',
      email: 'state@hptourism.gov.in',
      role: 'state_officer',
      district: 'Shimla',
      aadhaarNumber: '123456789003',
      password: hashedPassword,
    },
  ]).returning();

  console.log('✅ Created 3 test users');
  console.log('   - Mobile: 9999999991, Password: test123 (Property Owner)');
  console.log('   - Username: district, Password: test123 (District Officer)');
  console.log('   - Username: state, Password: test123 (State Officer)');

  // Insert 5 mock homestay properties with various statuses
  const mockProperties = [
    {
      userId: owner.id,
      applicationNumber: `HP-HS-2025-${Date.now()}-001`,
      propertyName: 'Mountain View Retreat',
      category: 'diamond' as const,
      totalRooms: 8,
      address: 'Naldehra Road, Near Golf Course, Shimla',
      district: 'Shimla',
      pincode: '171002',
      latitude: '31.0850',
      longitude: '77.1734',
      ownerName: 'Property Owner Demo',
      ownerMobile: '9999999991',
      ownerEmail: 'owner@hptourism.com',
      ownerAadhaar: '123456789001',
      amenities: {
        wifi: true,
        parking: true,
        restaurant: true,
        hotWater: true,
        mountainView: true,
        garden: true,
        tv: true,
      },
      rooms: [
        { roomType: 'Deluxe', size: 300, count: 4 },
        { roomType: 'Suite', size: 450, count: 4 },
      ],
      baseFee: '5000.00',
      perRoomFee: '1000.00',
      gstAmount: '2340.00',
      totalFee: '15340.00',
      status: 'approved' as const,
      currentStage: 'final',
      districtOfficerId: districtOfficer.id,
      districtReviewDate: new Date(),
      districtNotes: 'Excellent property, meets all Diamond category standards',
      stateOfficerId: stateOfficer.id,
      stateReviewDate: new Date(),
      stateNotes: 'Approved. Exemplary homestay facility',
      certificateNumber: `HP-CERT-2025-${Date.now()}`,
      certificateIssuedDate: new Date(),
      certificateExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      approvedAt: new Date(),
    },
    {
      userId: owner.id,
      applicationNumber: `HP-HS-2025-${Date.now()}-002`,
      propertyName: 'Pine Valley Homestay',
      category: 'gold' as const,
      totalRooms: 5,
      address: 'Kufri Road, Near Himalayan Nature Park, Shimla',
      district: 'Shimla',
      pincode: '171012',
      latitude: '31.1048',
      longitude: '77.2659',
      ownerName: 'Property Owner Demo',
      ownerMobile: '9999999991',
      ownerEmail: 'owner@hptourism.com',
      ownerAadhaar: '123456789001',
      amenities: {
        wifi: true,
        parking: true,
        hotWater: true,
        mountainView: true,
        garden: true,
      },
      rooms: [
        { roomType: 'Standard', size: 200, count: 3 },
        { roomType: 'Deluxe', size: 280, count: 2 },
      ],
      baseFee: '3000.00',
      perRoomFee: '800.00',
      gstAmount: '1260.00',
      totalFee: '8260.00',
      status: 'state_review' as const,
      currentStage: 'state',
      districtOfficerId: districtOfficer.id,
      districtReviewDate: new Date(),
      districtNotes: 'Good property, forwarded to state level',
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      userId: owner.id,
      applicationNumber: `HP-HS-2025-${Date.now()}-003`,
      propertyName: 'Cedar Wood Cottage',
      category: 'silver' as const,
      totalRooms: 3,
      address: 'Mashobra Village, Near Reserve Forest, Shimla',
      district: 'Shimla',
      pincode: '171007',
      latitude: '31.1207',
      longitude: '77.2291',
      ownerName: 'Property Owner Demo',
      ownerMobile: '9999999991',
      ownerEmail: 'owner@hptourism.com',
      ownerAadhaar: '123456789001',
      amenities: {
        wifi: true,
        parking: true,
        hotWater: true,
        garden: true,
      },
      rooms: [
        { roomType: 'Standard', size: 180, count: 3 },
      ],
      baseFee: '2000.00',
      perRoomFee: '600.00',
      gstAmount: '720.00',
      totalFee: '4720.00',
      status: 'district_review' as const,
      currentStage: 'district',
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      userId: owner.id,
      applicationNumber: `HP-HS-2025-${Date.now()}-004`,
      propertyName: 'Himalayan Heritage Home',
      category: 'gold' as const,
      totalRooms: 6,
      address: 'The Mall Road, Near Christ Church, Shimla',
      district: 'Shimla',
      pincode: '171001',
      latitude: '31.1048',
      longitude: '77.1734',
      ownerName: 'Property Owner Demo',
      ownerMobile: '9999999991',
      ownerEmail: 'owner@hptourism.com',
      ownerAadhaar: '123456789001',
      amenities: {
        wifi: true,
        parking: true,
        hotWater: true,
        tv: true,
        laundry: true,
        roomService: true,
      },
      rooms: [
        { roomType: 'Standard', size: 220, count: 4 },
        { roomType: 'Deluxe', size: 300, count: 2 },
      ],
      baseFee: '3000.00',
      perRoomFee: '800.00',
      gstAmount: '1440.00',
      totalFee: '9440.00',
      status: 'approved' as const,
      currentStage: 'final',
      districtOfficerId: districtOfficer.id,
      districtReviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      districtNotes: 'Heritage property, well maintained',
      stateOfficerId: stateOfficer.id,
      stateReviewDate: new Date(),
      stateNotes: 'Approved for Gold category',
      certificateNumber: `HP-CERT-2025-${Date.now() + 1}`,
      certificateIssuedDate: new Date(),
      certificateExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      approvedAt: new Date(),
    },
    {
      userId: owner.id,
      applicationNumber: `HP-HS-2025-${Date.now()}-005`,
      propertyName: 'Snowfall Cottage',
      category: 'silver' as const,
      totalRooms: 4,
      address: 'Chharabra Village, Near Wildflower Hall, Shimla',
      district: 'Shimla',
      pincode: '171012',
      latitude: '31.1207',
      longitude: '77.2659',
      ownerName: 'Property Owner Demo',
      ownerMobile: '9999999991',
      ownerEmail: 'owner@hptourism.com',
      ownerAadhaar: '123456789001',
      amenities: {
        wifi: true,
        parking: true,
        hotWater: true,
        mountainView: true,
        petFriendly: true,
      },
      rooms: [
        { roomType: 'Standard', size: 190, count: 4 },
      ],
      baseFee: '2000.00',
      perRoomFee: '600.00',
      gstAmount: '900.00',
      totalFee: '5900.00',
      status: 'submitted' as const,
      currentStage: 'district',
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  ];

  await db.insert(homestayApplications).values(mockProperties);
  
  console.log('✅ Created 5 mock homestay properties');
  console.log('   - 2 Approved properties (Diamond & Gold)');
  console.log('   - 1 At State Review (Gold)');
  console.log('   - 1 At District Review (Silver)');
  console.log('   - 1 Submitted (Silver)');
  console.log('');
  console.log('🎉 Mock data seeding complete!');
  console.log('');
  console.log('📝 Login Credentials:');
  console.log('   Property Owner: mobile=9999999991, password=test123');
  console.log('   District Officer: mobile=district, password=test123');
  console.log('   State Officer: mobile=state, password=test123');
}

seedMockData()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
