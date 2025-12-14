#!/usr/bin/env node
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const connectionString = process.env.DATABASE_URL || 'postgresql://hptourism_user:8fd2fa604c5cd25571427be2ec22bf4c@localhost:5432/hptourism_stg';

const ownerSpecs = [
  { district: 'Shimla', mobile: '7000000001' },
  { district: 'Kullu', mobile: '7000000002' },
  { district: 'Kangra', mobile: '7000000003' },
  { district: 'Hamirpur', mobile: '7000000004' },
  { district: 'Mandi', mobile: '7000000005' },
  { district: 'Chamba', mobile: '7000000006' },
  { district: 'Una', mobile: '7000000007' },
  { district: 'Bilaspur', mobile: '7000000008' },
  { district: 'Sirmaur', mobile: '7000000009' },
  { district: 'Solan', mobile: '7000000010' },
  { district: 'Kinnaur', mobile: '7000000011' },
  { district: 'Lahaul & Spiti', mobile: '7000000012' },
];

const passwordPlain = 'Owner@2025';

async function deleteExistingOwners(client) {
  const ownerRes = await client.query("SELECT id FROM users WHERE role='property_owner'");
  const ownerIds = ownerRes.rows.map((row) => row.id);
  if (ownerIds.length === 0) return;
  const appRes = await client.query('SELECT id FROM homestay_applications WHERE user_id = ANY($1::text[])', [ownerIds]);
  const appIds = appRes.rows.map((row) => row.id);
  if (appIds.length > 0) {
    const tables = [
      'himkosh_transactions',
      'payments',
      'documents',
      'inspection_reports',
      'inspection_orders',
      'application_actions',
      'clarifications',
      'objections',
      'notifications'
    ];
    for (const table of tables) {
      await client.query(`DELETE FROM ${table} WHERE application_id = ANY($1::text[])`, [appIds]);
    }
  }
  await client.query('DELETE FROM homestay_applications WHERE id = ANY($1::text[])', [appIds]);
  await client.query('DELETE FROM user_profiles WHERE user_id = ANY($1::text[])', [ownerIds]);
  await client.query('DELETE FROM users WHERE id = ANY($1::text[])', [ownerIds]);
}

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    console.log('🔁 Removing existing property owner data...');
    await client.query('BEGIN');
    await deleteExistingOwners(client);

    console.log('🆕 Creating demo owners...');
    const hashed = await bcrypt.hash(passwordPlain, 10);

    for (const spec of ownerSpecs) {
      const fullName = `Owner ${spec.district}`;
      const insertUserResult = await client.query(
        `INSERT INTO users (mobile, full_name, role, district, password, is_active, created_at, updated_at)
         VALUES ($1, $2, 'property_owner', $3, $4, true, NOW(), NOW())
         RETURNING id`,
        [spec.mobile, fullName, spec.district, hashed]
      );
      const userId = insertUserResult.rows[0].id;
      await client.query(
        `INSERT INTO user_profiles (user_id, full_name, gender, mobile, district, address, created_at, updated_at)
         VALUES ($1, $2, 'other', $3, $4, $5, NOW(), NOW())`,
        [userId, fullName, spec.mobile, spec.district, `${spec.district} Demo Address`]
      );
      console.log(`   • ${fullName} (${spec.mobile})`);
    }

    await client.query('COMMIT');
    console.log(`✅ Seeded ${ownerSpecs.length} demo owners. Default password: ${passwordPlain}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to reset demo owners:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
