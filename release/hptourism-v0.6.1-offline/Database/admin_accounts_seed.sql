CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (id, mobile, full_name, first_name, last_name, username, role, email, password, district, is_active, created_at, updated_at)
VALUES (
  'super-admin-001',
  '9999999998',
  'Super Admin',
  'Super',
  'Admin',
  'superadmin',
  'super_admin',
  'superadmin@himachaltourism.gov.in',
  crypt('Ulan@2025', gen_salt('bf')),
  'Shimla',
  true,
  now(),
  now()
)
ON CONFLICT (id)
DO UPDATE SET
  mobile = EXCLUDED.mobile,
  full_name = EXCLUDED.full_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  username = EXCLUDED.username,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  district = EXCLUDED.district,
  is_active = true,
  updated_at = now();

INSERT INTO users (id, mobile, full_name, first_name, last_name, username, role, email, password, district, is_active, created_at, updated_at)
VALUES (
  'admin-001',
  '9999999999',
  'System Admin',
  'System',
  'Admin',
  'admin',
  'admin',
  'admin@himachaltourism.gov.in',
  crypt('Admin@2025', gen_salt('bf')),
  'Shimla',
  true,
  now(),
  now()
)
ON CONFLICT (id)
DO UPDATE SET
  mobile = EXCLUDED.mobile,
  full_name = EXCLUDED.full_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  username = EXCLUDED.username,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  district = EXCLUDED.district,
  is_active = true,
  updated_at = now();

INSERT INTO users (id, mobile, full_name, first_name, last_name, username, role, email, password, district, is_active, created_at, updated_at)
VALUES (
  'f6cb4b30-6ee5-4e8a-a9bb-4d64fdb9429e',
  '9999999997',
  'Admin RC Console',
  'Admin',
  'RC',
  'adminrc',
  'admin_rc',
  'admin.rc@hp.gov.in',
  crypt('ulan@2025', gen_salt('bf')),
  'Shimla',
  true,
  now(),
  now()
)
ON CONFLICT (id)
DO UPDATE SET
  mobile = EXCLUDED.mobile,
  full_name = EXCLUDED.full_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  username = EXCLUDED.username,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  district = EXCLUDED.district,
  is_active = true,
  updated_at = now();
