import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users, userProfiles, homestayApplications } from "../shared/schema";
import { eq } from "drizzle-orm";

interface LegacyProfile {
  code: string;
  owner: {
    fullName: string;
    gender: "male" | "female" | "other";
    mobile: string;
    email: string;
    aadhaar: string;
    district: string;
  };
  property: {
    name: string;
    address: string;
    district: string;
    tehsil: string;
    block?: string;
    gramPanchayat?: string;
    pincode: string;
    locationType: "gp" | "mc" | "tcp";
    totalRooms: number;
    singleRooms: number;
    doubleRooms: number;
    familySuites: number;
    attachedWashrooms: number;
    areaSqm: number;
    distances?: {
      airport?: number;
      railway?: number;
      city?: number;
      market?: number;
      bus?: number;
    };
  };
}

const profiles: LegacyProfile[] = [
  {
    code: "GC",
    owner: {
      fullName: "Hemant Kumar",
      gender: "male",
      mobile: "6666666611",
      email: "greenchakloo.demo@hp.gov",
      aadhaar: "666666666611",
      district: "Shimla",
    },
    property: {
      name: "Green Chakloo",
      address: "Village Chakloo, PO Baldeyan, Tehsil & Distt Shimla",
      district: "Shimla",
      tehsil: "Shimla",
      block: "Kharapathar",
      gramPanchayat: "Chakloo",
      pincode: "171015",
      locationType: "gp",
      totalRooms: 6,
      singleRooms: 0,
      doubleRooms: 6,
      familySuites: 0,
      attachedWashrooms: 6,
      areaSqm: 600,
      distances: {
        airport: 41,
        railway: 25,
        city: 22,
        market: 15,
        bus: 25,
      },
    },
  },
  {
    code: "DI",
    owner: {
      fullName: "Devender Kumar Chauhan",
      gender: "male",
      mobile: "6666666612",
      email: "devbhoomi.demo@hp.gov",
      aadhaar: "666666666612",
      district: "Shimla",
    },
    property: {
      name: "Devbhoomi Inn Shimla",
      address: "Chauhan Cottage, Lower Kachighatti, Shimla",
      district: "Shimla",
      tehsil: "Kotkhai",
      gramPanchayat: "Lower Kachighatti",
      pincode: "171202",
      locationType: "gp",
      totalRooms: 4,
      singleRooms: 0,
      doubleRooms: 4,
      familySuites: 0,
      attachedWashrooms: 4,
      areaSqm: 880,
      distances: {
        airport: 18,
        railway: 4,
        city: 6,
        market: 6,
        bus: 1,
      },
    },
  },
  {
    code: "HH",
    owner: {
      fullName: "Tashi Palmo",
      gender: "female",
      mobile: "6666666613",
      email: "humble.demo@hp.gov",
      aadhaar: "666666666613",
      district: "Shimla",
    },
    property: {
      name: "Humble Home Stay",
      address: "Palmo Cottage, Munish Homestay, VPO Beolia, Shimla",
      district: "Shimla",
      tehsil: "Shimla",
      gramPanchayat: "Beolia",
      pincode: "171013",
      locationType: "gp",
      totalRooms: 4,
      singleRooms: 2,
      doubleRooms: 2,
      familySuites: 0,
      attachedWashrooms: 4,
      areaSqm: 300,
      distances: {
        airport: 30,
        railway: 11,
        city: 2,
        market: 2,
        bus: 0,
      },
    },
  },
];

async function seedLegacyProfiles() {
  const passwordHash = await bcrypt.hash("Legacy@123", 10);

  for (const profile of profiles) {
    const existing = await db.select().from(users).where(eq(users.mobile, profile.owner.mobile));
    if (existing.length > 0) {
      console.log(`⚠️  User with mobile ${profile.owner.mobile} already exists – skipping.`);
      continue;
    }

    const [user] = await db
      .insert(users)
      .values({
        mobile: profile.owner.mobile,
        fullName: profile.owner.fullName,
        email: profile.owner.email,
        role: "property_owner",
        district: profile.owner.district,
        aadhaarNumber: profile.owner.aadhaar,
        password: passwordHash,
      })
      .returning();

    await db.insert(userProfiles).values({
      userId: user.id,
      fullName: profile.owner.fullName,
      gender: profile.owner.gender,
      aadhaarNumber: profile.owner.aadhaar,
      mobile: profile.owner.mobile,
      email: profile.owner.email,
      district: profile.owner.district,
      tehsil: profile.property.tehsil,
      block: profile.property.block || null,
      gramPanchayat: profile.property.gramPanchayat || null,
      address: profile.property.address,
      pincode: profile.property.pincode,
    });

    await db.insert(homestayApplications).values({
      userId: user.id,
      applicationNumber: `LEGACY-${profile.code}-${Date.now()}`,
      propertyName: profile.property.name,
      category: "silver",
      locationType: profile.property.locationType,
      totalRooms: profile.property.totalRooms,
      district: profile.property.district,
      tehsil: profile.property.tehsil,
      block: profile.property.block || null,
      gramPanchayat: profile.property.gramPanchayat || null,
      address: profile.property.address,
      pincode: profile.property.pincode,
      ownerName: profile.owner.fullName,
      ownerGender: profile.owner.gender,
      ownerMobile: profile.owner.mobile,
      ownerEmail: profile.owner.email,
      ownerAadhaar: profile.owner.aadhaar,
      propertyOwnership: "owned",
      projectType: "new_project",
      propertyArea: profile.property.areaSqm.toString(),
      singleBedRooms: profile.property.singleRooms,
      doubleBedRooms: profile.property.doubleRooms,
      familySuites: profile.property.familySuites,
      attachedWashrooms: profile.property.attachedWashrooms,
      distanceAirport: profile.property.distances?.airport,
      distanceRailway: profile.property.distances?.railway,
      distanceCityCenter: profile.property.distances?.city,
      distanceShopping: profile.property.distances?.market,
      distanceBusStand: profile.property.distances?.bus,
      rooms: [
        ...(profile.property.singleRooms
          ? [{ roomType: "Single", size: 140, count: profile.property.singleRooms }]
          : []),
        ...(profile.property.doubleRooms
          ? [{ roomType: "Double", size: 200, count: profile.property.doubleRooms }]
          : []),
        ...(profile.property.familySuites
          ? [{ roomType: "Family Suite", size: 260, count: profile.property.familySuites }]
          : []),
      ],
      status: "draft",
      currentStage: "document_upload",
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Seeded legacy profile for ${profile.owner.fullName} (${profile.property.name})`);
  }

  console.log("Done. Default password for all seeded users: Legacy@123");
}

seedLegacyProfiles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  });
