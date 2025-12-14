import bcrypt from 'bcrypt';
import { db } from './db';
import { users, ddoCodes } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { getDistrictStaffManifest } from '../shared/districtStaffManifest';

/**
 * Database Seed Script
 * Creates default admin user and initial data for the HP Tourism portal
 * Safe to run multiple times (idempotent)
 */

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Check if admin user already exists
    const adminMobile = '9999999999';
    const adminPassword = 'admin123';
    const adminFirstName = 'Admin';
    const adminLastName = 'Admin';
    const adminUsername = 'admin';
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await db.select()
      .from(users)
      .where(eq(users.mobile, adminMobile))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log(`✅ Admin user already exists (mobile: ${adminMobile})`);
      
      // Update to ensure role, status, and password are correct
      await db.update(users)
        .set({
          role: 'admin',
          isActive: true,
          password: hashedAdminPassword,
          fullName: 'Admin Admin',
          firstName: adminFirstName,
          lastName: adminLastName,
          username: adminUsername,
        })
        .where(eq(users.mobile, adminMobile));
      
      console.log('✅ Admin credentials verified/updated');
    } else {
      // Create default admin user
      await db.insert(users).values({
        mobile: adminMobile,
        password: hashedAdminPassword,
        fullName: 'Admin Admin',
        firstName: adminFirstName,
        lastName: adminLastName,
        username: adminUsername,
        role: 'admin',
        isActive: true,
      });
      
      console.log('✅ Admin user created successfully');
      console.log(`   Mobile: ${adminMobile}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('   ⚠️  IMPORTANT: Change this password in production!');
    }

    // Seed DDO codes for district-wise payment routing
    console.log('🏛️  Seeding DDO codes for all districts...');
    
    const ddoData = [
      { district: 'Chamba', ddoCode: 'CHM00-532', ddoDescription: 'D.T.D.O. CHAMBA', treasuryCode: 'CHM00' },
      { district: 'Bharmour', ddoCode: 'CHM01-001', ddoDescription: 'S.D.O.(CIVIL) BHARMOUR', treasuryCode: 'CHM01' },
      { district: 'Shimla (Central)', ddoCode: 'CTO00-068', ddoDescription: 'A.C. (TOURISM) SHIMLA', treasuryCode: 'CTO00' },
      { district: 'Hamirpur', ddoCode: 'HMR00-053', ddoDescription: 'DISTRICT TOURISM DEVELOPMENT OFFICE HAMIRPUR (UNA)', treasuryCode: 'HMR00' },
      { district: 'Una', ddoCode: 'HMR00-053', ddoDescription: 'DISTRICT TOURISM DEVELOPMENT OFFICE HAMIRPUR (UNA)', treasuryCode: 'HMR00' },
      { district: 'Kullu (Dhalpur)', ddoCode: 'KLU00-532', ddoDescription: 'DEPUTY DIRECTOR TOURISM AND CIVIL AVIATION KULLU DHALPUR', treasuryCode: 'KLU00' },
      { district: 'Kangra', ddoCode: 'KNG00-532', ddoDescription: 'DIV.TOURISM DEV.OFFICER(DTDO) DHARAMSALA', treasuryCode: 'KNG00' },
      { district: 'Kinnaur', ddoCode: 'KNR00-031', ddoDescription: 'DISTRICT TOURISM DEVELOPMENT OFFICER KINNAUR AT RECKONG PEO', treasuryCode: 'KNR00' },
      { district: 'Lahaul-Spiti (Kaza)', ddoCode: 'KZA00-011', ddoDescription: 'PO ITDP KAZA', treasuryCode: 'KZA00' },
      { district: 'Lahaul', ddoCode: 'LHL00-017', ddoDescription: 'DISTRICT TOURISM DEVELOPMENT OFFICER', treasuryCode: 'LHL00' },
      { district: 'Mandi', ddoCode: 'MDI00-532', ddoDescription: 'DIV. TOURISM DEV. OFFICER MANDI', treasuryCode: 'MDI00' },
      { district: 'Pangi', ddoCode: 'PNG00-003', ddoDescription: 'PROJECT OFFICER ITDP PANGI', treasuryCode: 'PNG00' },
      { district: 'Shimla', ddoCode: 'SML00-532', ddoDescription: 'DIVISIONAL TOURISM OFFICER SHIMLA', treasuryCode: 'SML00' },
      { district: 'Sirmour', ddoCode: 'SMR00-055', ddoDescription: 'DISTRICT TOURISM DEVELOPMENT OFFICE NAHAN', treasuryCode: 'SMR00' },
      { district: 'Solan', ddoCode: 'SOL00-046', ddoDescription: 'DTDO SOLAN', treasuryCode: 'SOL00' },
    ];

    // Insert DDO codes (skip if already exist)
    for (const ddo of ddoData) {
      const existing = await db.select()
        .from(ddoCodes)
        .where(eq(ddoCodes.district, ddo.district))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(ddoCodes).values(ddo);
      }
    }
    
    console.log(`✅ DDO codes seeded successfully (${ddoData.length} districts)`);

    // Create super_admin account for system maintenance operations
    console.log('👑 Creating super admin account...');
    
    const superAdminMobile = '9999999998';
    const superAdminPassword = 'ulan@2025';
    const superAdminFirstName = 'Super';
    const superAdminLastName = 'Admin';
    const superAdminUsername = 'superadmin';
    const hashedSuperAdminPassword = await bcrypt.hash(superAdminPassword, 10);

    const existingSuperAdmin = await db.select()
      .from(users)
      .where(eq(users.mobile, superAdminMobile))
      .limit(1);

    if (existingSuperAdmin.length > 0) {
      console.log(`✅ Super admin user already exists (mobile: ${superAdminMobile})`);
      
      // Update to ensure role, status, and password are correct
      await db.update(users)
        .set({
          role: 'super_admin',
          isActive: true,
          password: hashedSuperAdminPassword,
          fullName: 'Super Admin',
          firstName: superAdminFirstName,
          lastName: superAdminLastName,
          username: superAdminUsername,
        })
        .where(eq(users.mobile, superAdminMobile));
      
      console.log('✅ Super admin credentials verified/updated');
    } else {
      // Create super admin user
      await db.insert(users).values({
        mobile: superAdminMobile,
        email: 'superadmin@himachaltourism.gov.in',
        password: hashedSuperAdminPassword,
        fullName: 'Super Admin',
        firstName: superAdminFirstName,
        lastName: superAdminLastName,
        username: superAdminUsername,
        role: 'super_admin',
        isActive: true,
      });
      
      console.log('✅ Super admin user created successfully');
      console.log(`   Mobile: ${superAdminMobile}`);
      console.log('   Email: superadmin@himachaltourism.gov.in');
      console.log(`   Password: ${superAdminPassword}`);
      console.log('   ⚠️  IMPORTANT: This account has full system access including reset operations!');
      console.log('   ⚠️  Change this password immediately after first login!');
    }

    // Seed all district staff (Dealing Assistants + DTDOs)
    console.log('👥 Seeding district staff accounts (DA & DTDO)…');
    const staffManifest = getDistrictStaffManifest();
    let daUpserts = 0;
    let dtdoUpserts = 0;

    for (const entry of staffManifest) {
      for (const roleKey of ['da', 'dtdo'] as const) {
        const staffRecord = entry[roleKey];
        const role =
          roleKey === 'da' ? 'dealing_assistant' : 'district_tourism_officer';
        const designation =
          roleKey === 'da'
            ? 'Dealing Assistant'
            : 'District Tourism Development Officer';
        const fullNameSuffix = roleKey === 'da' ? 'DA' : 'DTDO';
        const hashedPassword = await bcrypt.hash(staffRecord.password, 10);

        const existing = await db
          .select()
          .from(users)
          .where(eq(users.mobile, staffRecord.mobile))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(users)
            .set({
              role,
              district: entry.districtLabel,
              username: staffRecord.username,
              email: staffRecord.email,
              fullName: `${staffRecord.fullName} (${fullNameSuffix} ${entry.districtLabel})`,
              designation,
              password: hashedPassword,
              isActive: true,
            })
            .where(eq(users.mobile, staffRecord.mobile));
        } else {
          await db.insert(users).values({
            mobile: staffRecord.mobile,
            email: staffRecord.email,
            password: hashedPassword,
            fullName: `${staffRecord.fullName} (${fullNameSuffix} ${entry.districtLabel})`,
            role,
            district: entry.districtLabel,
            username: staffRecord.username,
            designation,
            isActive: true,
          });
        }

        if (roleKey === 'da') {
          daUpserts += 1;
        } else {
          dtdoUpserts += 1;
        }
      }
    }

    console.log(
      `✅ District staff accounts ensured (${daUpserts} DA, ${dtdoUpserts} DTDO)`
    );
    console.log(
      '   ➜ Reference credentials: seed_data/district-staff-accounts.csv'
    );

    const sampleEntry =
      staffManifest.find(
        (entry) =>
          entry.districtLabel.toLowerCase().includes('shimla') ||
          entry.da.username === 'da_shimla'
      ) ?? staffManifest[0];

    console.log('\n📋 Summary of Default Accounts:');
    console.log('┌────────────────────┬──────────────┬──────────────────┬──────────────────────┐');
    console.log('│ Role               │ Mobile       │ Password         │ Access Level         │');
    console.log('├────────────────────┼──────────────┼──────────────────┼──────────────────────┤');
    console.log('│ Admin              │ 9999999999   │ admin123         │ User Management      │');
    console.log('│ Super Admin        │ 9999999998   │ SuperAdmin@2025  │ Full System + Reset  │');
    console.log(`│ Dealing Assistants │ ${daUpserts
      .toString()
      .padEnd(12)} │ refer manifest   │ District Queues      │`);
    console.log(`│ DTDOs              │ ${dtdoUpserts
      .toString()
      .padEnd(12)} │ refer manifest   │ District Escalations │`);
    if (sampleEntry) {
      console.log('├────────────────────┼──────────────┼──────────────────┼──────────────────────┤');
      console.log(
        `│ Sample DA (${sampleEntry.districtLabel
          .slice(0, 12)
          .padEnd(12)}) │ ${sampleEntry.da.mobile.padEnd(12)} │ ${sampleEntry.da.password.padEnd(
          16
        )} │ ${sampleEntry.districtLabel.padEnd(20).slice(0, 20)} │`
      );
      console.log(
        `│ Sample DTDO (${sampleEntry.districtLabel
          .slice(0, 12)
          .padEnd(12)}) │ ${sampleEntry.dtdo.mobile.padEnd(12)} │ ${sampleEntry.dtdo.password.padEnd(
          16
        )} │ ${sampleEntry.districtLabel.padEnd(20).slice(0, 20)} │`
      );
    }
    console.log('└────────────────────┴──────────────┴──────────────────┴──────────────────────┘');

    console.log('\n🎉 Database seed completed successfully!');
    console.log('   Run this script anytime to ensure default accounts and DDO codes exist.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seed();
