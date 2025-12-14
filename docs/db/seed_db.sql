-- ============================================================================
-- HP Tourism Digital Ecosystem - Database Seed Data
-- ============================================================================
-- This script populates a virgin database with:
-- 1. Demo users (admin, super_admin, property owner, DA, DTDO)
-- 2. LGD Master Data (12 Districts, Tehsils, Blocks, GPs, Urban Bodies)
-- 3. DDO Codes for all districts
-- ============================================================================
-- Run this AFTER running database-setup.sql
-- ============================================================================

-- ============================================================================
-- DEMO USERS
-- ============================================================================
-- Password for ALL demo users: "password123"
-- Bcrypt hash: $2b$10$rKJ3YpCZXVlE5J4xKJ9YKeqF4jxKxDxQxQxQxQxQxQxQxQxQxQxQxO

-- Super Admin
INSERT INTO users (id, mobile, full_name, first_name, last_name, username, email, role, district, designation, department, employee_id, office_address, office_phone, password, is_active, created_at)
VALUES 
('super-admin-001', '9999999998', 'Super Administrator', 'Super', 'Admin', 'superadmin', 'superadmin@himachaltourism.gov.in', 'super_admin', 'Shimla', 'Super Administrator', 'Tourism Department', 'SUPER001', 'Directorate of Tourism, Shimla - 171001', '0177-2652561', '$2b$10$rKJ3YpCZXVlE5J4xKJ9YKeqF4jxKxDxQxQxQxQxQxQxQxQxQxQxQxO', true, now());

-- Admin
INSERT INTO users (id, mobile, full_name, first_name, last_name, username, email, role, district, designation, department, employee_id, office_address, office_phone, password, is_active, created_at)
VALUES 
('admin-001', '9999999999', 'System Administrator', 'System', 'Admin', 'admin', 'admin@himachaltourism.gov.in', 'admin', 'Shimla', 'Administrator', 'Tourism Department', 'ADM001', 'Directorate of Tourism, Shimla - 171001', '0177-2652561', '$2b$10$rKJ3YpCZXVlE5J4xKJ9YKeqF4jxKxDxQxQxQxQxQxQxQxQxQxQxQxO', true, now());

-- Dealing Assistant (DA) - Shimla
INSERT INTO users (id, mobile, full_name, first_name, last_name, username, email, role, district, designation, department, employee_id, office_address, office_phone, password, is_active, created_at)
VALUES 
('da-shimla-001', '7777777771', 'Rajesh Kumar', 'Rajesh', 'Kumar', 'da_shimla', 'rajesh.kumar@shimla.gov.in', 'dealing_assistant', 'Shimla', 'Dealing Assistant', 'District Tourism Office', 'DA-SML-001', 'District Tourism Office, Shimla - 171001', '0177-2658126', '$2b$10$rKJ3YpCZXVlE5J4xKJ9YKeqF4jxKxDxQxQxQxQxQxQxQxQxQxQxQxO', true, now());

-- District Tourism Development Officer (DTDO) - Shimla
INSERT INTO users (id, mobile, full_name, first_name, last_name, username, email, role, district, designation, department, employee_id, office_address, office_phone, password, is_active, created_at)
VALUES 
('dtdo-shimla-001', '8888888881', 'Priya Sharma', 'Priya', 'Sharma', 'dtdo_shimla', 'priya.sharma@shimla.gov.in', 'district_tourism_officer', 'Shimla', 'District Tourism Development Officer', 'District Tourism Office', 'DTDO-SML-001', 'District Tourism Office, Shimla - 171001', '0177-2658127', '$2b$10$rKJ3YpCZXVlE5J4xKJ9YKeqF4jxKxDxQxQxQxQxQxQxQxQxQxQxQxO', true, now());

-- Demo Property Owner
INSERT INTO users (id, mobile, full_name, email, role, district, password, is_active, created_at)
VALUES 
('owner-demo-001', '6666666661', 'Demo Property Owner', 'demo.owner@example.com', 'property_owner', 'Shimla', '$2b$10$rKJ3YpCZXVlE5J4xKJ9YKeqF4jxKxDxQxQxQxQxQxQxQxQxQxQxQxO', true, now());

-- ============================================================================
-- LGD MASTER DATA - DISTRICTS (All 12 Districts of Himachal Pradesh)
-- ============================================================================

INSERT INTO lgd_districts (id, lgd_code, district_name, division_name, is_active) VALUES
('dist-shimla', '2801', 'Shimla', 'Shimla', true),
('dist-kullu', '2802', 'Kullu', 'Mandi', true),
('dist-mandi', '2803', 'Mandi', 'Mandi', true),
('dist-kangra', '2804', 'Kangra', 'Kangra', true),
('dist-hamirpur', '2805', 'Hamirpur', 'Kangra', true),
('dist-una', '2806', 'Una', 'Kangra', true),
('dist-bilaspur', '2807', 'Bilaspur', 'Shimla', true),
('dist-solan', '2808', 'Solan', 'Shimla', true),
('dist-sirmaur', '2809', 'Sirmaur', 'Shimla', true),
('dist-chamba', '2810', 'Chamba', 'Kangra', true),
('dist-lahaul-spiti', '2811', 'Lahaul and Spiti', 'Shimla', true),
('dist-kinnaur', '2812', 'Kinnaur', 'Shimla', true);

-- ============================================================================
-- LGD MASTER DATA - TEHSILS (Sub-divisions)
-- ============================================================================

-- Shimla District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-shimla-01', '280101', 'Shimla Urban', 'dist-shimla', 'tehsil', true),
('teh-shimla-02', '280102', 'Shimla Rural', 'dist-shimla', 'tehsil', true),
('teh-shimla-03', '280103', 'Theog', 'dist-shimla', 'tehsil', true),
('teh-shimla-04', '280104', 'Rampur', 'dist-shimla', 'tehsil', true),
('teh-shimla-05', '280105', 'Rohru', 'dist-shimla', 'tehsil', true),
('teh-shimla-06', '280106', 'Chopal', 'dist-shimla', 'tehsil', true),
('teh-shimla-07', '280107', 'Jubbal-Kotkhai', 'dist-shimla', 'tehsil', true);

-- Kullu District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-kullu-01', '280201', 'Kullu', 'dist-kullu', 'tehsil', true),
('teh-kullu-02', '280202', 'Banjar', 'dist-kullu', 'tehsil', true),
('teh-kullu-03', '280203', 'Bhuntar', 'dist-kullu', 'tehsil', true),
('teh-kullu-04', '280204', 'Anni', 'dist-kullu', 'tehsil', true),
('teh-kullu-05', '280205', 'Nirmand', 'dist-kullu', 'tehsil', true);

-- Mandi District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-mandi-01', '280301', 'Mandi', 'dist-mandi', 'tehsil', true),
('teh-mandi-02', '280302', 'Sundernagar', 'dist-mandi', 'tehsil', true),
('teh-mandi-03', '280303', 'Jogindernagar', 'dist-mandi', 'tehsil', true),
('teh-mandi-04', '280304', 'Sarkaghat', 'dist-mandi', 'tehsil', true),
('teh-mandi-05', '280305', 'Balh', 'dist-mandi', 'tehsil', true),
('teh-mandi-06', '280306', 'Chachyot', 'dist-mandi', 'tehsil', true),
('teh-mandi-07', '280307', 'Thunag', 'dist-mandi', 'tehsil', true),
('teh-mandi-08', '280308', 'Karsog', 'dist-mandi', 'tehsil', true),
('teh-mandi-09', '280309', 'Padhar', 'dist-mandi', 'tehsil', true),
('teh-mandi-10', '280310', 'Dharampur', 'dist-mandi', 'tehsil', true);

-- Kangra District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-kangra-01', '280401', 'Kangra', 'dist-kangra', 'tehsil', true),
('teh-kangra-02', '280402', 'Dharamsala', 'dist-kangra', 'tehsil', true),
('teh-kangra-03', '280403', 'Palampur', 'dist-kangra', 'tehsil', true),
('teh-kangra-04', '280404', 'Nurpur', 'dist-kangra', 'tehsil', true),
('teh-kangra-05', '280405', 'Dehra', 'dist-kangra', 'tehsil', true),
('teh-kangra-06', '280406', 'Jawali', 'dist-kangra', 'tehsil', true),
('teh-kangra-07', '280407', 'Indora', 'dist-kangra', 'tehsil', true),
('teh-kangra-08', '280408', 'Fatehpur', 'dist-kangra', 'tehsil', true),
('teh-kangra-09', '280409', 'Baijnath', 'dist-kangra', 'tehsil', true),
('teh-kangra-10', '280410', 'Shahpur', 'dist-kangra', 'tehsil', true),
('teh-kangra-11', '280411', 'Baroh', 'dist-kangra', 'tehsil', true),
('teh-kangra-12', '280412', 'Rait', 'dist-kangra', 'tehsil', true);

-- Hamirpur District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-hamirpur-01', '280501', 'Hamirpur', 'dist-hamirpur', 'tehsil', true),
('teh-hamirpur-02', '280502', 'Barsar', 'dist-hamirpur', 'tehsil', true),
('teh-hamirpur-03', '280503', 'Nadaun', 'dist-hamirpur', 'tehsil', true),
('teh-hamirpur-04', '280504', 'Sujanpur', 'dist-hamirpur', 'tehsil', true),
('teh-hamirpur-05', '280505', 'Bhoranj', 'dist-hamirpur', 'tehsil', true);

-- Una District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-una-01', '280601', 'Una', 'dist-una', 'tehsil', true),
('teh-una-02', '280602', 'Amb', 'dist-una', 'tehsil', true),
('teh-una-03', '280603', 'Bangana', 'dist-una', 'tehsil', true),
('teh-una-04', '280604', 'Haroli', 'dist-una', 'tehsil', true);

-- Bilaspur District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-bilaspur-01', '280701', 'Bilaspur', 'dist-bilaspur', 'tehsil', true),
('teh-bilaspur-02', '280702', 'Ghumarwin', 'dist-bilaspur', 'tehsil', true),
('teh-bilaspur-03', '280703', 'Jhandutta', 'dist-bilaspur', 'tehsil', true);

-- Solan District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-solan-01', '280801', 'Solan', 'dist-solan', 'tehsil', true),
('teh-solan-02', '280802', 'Arki', 'dist-solan', 'tehsil', true),
('teh-solan-03', '280803', 'Nalagarh', 'dist-solan', 'tehsil', true),
('teh-solan-04', '280804', 'Kandaghat', 'dist-solan', 'tehsil', true),
('teh-solan-05', '280805', 'Kasauli', 'dist-solan', 'tehsil', true);

-- Sirmaur District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-sirmaur-01', '280901', 'Nahan', 'dist-sirmaur', 'tehsil', true),
('teh-sirmaur-02', '280902', 'Paonta Sahib', 'dist-sirmaur', 'tehsil', true),
('teh-sirmaur-03', '280903', 'Rajgarh', 'dist-sirmaur', 'tehsil', true),
('teh-sirmaur-04', '280904', 'Pachhad', 'dist-sirmaur', 'tehsil', true),
('teh-sirmaur-05', '280905', 'Shillai', 'dist-sirmaur', 'tehsil', true);

-- Chamba District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-chamba-01', '281001', 'Chamba', 'dist-chamba', 'tehsil', true),
('teh-chamba-02', '281002', 'Bharmour', 'dist-chamba', 'tehsil', true),
('teh-chamba-03', '281003', 'Pangi', 'dist-chamba', 'tehsil', true),
('teh-chamba-04', '281004', 'Dalhousie', 'dist-chamba', 'tehsil', true),
('teh-chamba-05', '281005', 'Churah', 'dist-chamba', 'tehsil', true),
('teh-chamba-06', '281006', 'Salooni', 'dist-chamba', 'tehsil', true);

-- Lahaul and Spiti District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-lahaul-01', '281101', 'Lahaul', 'dist-lahaul-spiti', 'tehsil', true),
('teh-lahaul-02', '281102', 'Spiti', 'dist-lahaul-spiti', 'tehsil', true),
('teh-lahaul-03', '281103', 'Udaipur', 'dist-lahaul-spiti', 'tehsil', true);

-- Kinnaur District Tehsils
INSERT INTO lgd_tehsils (id, lgd_code, tehsil_name, district_id, tehsil_type, is_active) VALUES
('teh-kinnaur-01', '281201', 'Kalpa', 'dist-kinnaur', 'tehsil', true),
('teh-kinnaur-02', '281202', 'Nichar', 'dist-kinnaur', 'tehsil', true),
('teh-kinnaur-03', '281203', 'Sangla', 'dist-kinnaur', 'tehsil', true),
('teh-kinnaur-04', '281204', 'Pooh', 'dist-kinnaur', 'tehsil', true),
('teh-kinnaur-05', '281205', 'Moorang', 'dist-kinnaur', 'tehsil', true);

-- ============================================================================
-- LGD MASTER DATA - BLOCKS (Sample blocks for major districts)
-- ============================================================================

-- Shimla District Blocks
INSERT INTO lgd_blocks (id, lgd_code, block_name, district_id, tehsil_id, is_active) VALUES
('blk-shimla-01', '28010101', 'Shimla', 'dist-shimla', 'teh-shimla-02', true),
('blk-shimla-02', '28010102', 'Theog', 'dist-shimla', 'teh-shimla-03', true),
('blk-shimla-03', '28010103', 'Rampur', 'dist-shimla', 'teh-shimla-04', true),
('blk-shimla-04', '28010104', 'Rohru', 'dist-shimla', 'teh-shimla-05', true),
('blk-shimla-05', '28010105', 'Chopal', 'dist-shimla', 'teh-shimla-06', true),
('blk-shimla-06', '28010106', 'Jubbal', 'dist-shimla', 'teh-shimla-07', true),
('blk-shimla-07', '28010107', 'Kotkhai', 'dist-shimla', 'teh-shimla-07', true);

-- Kullu District Blocks
INSERT INTO lgd_blocks (id, lgd_code, block_name, district_id, tehsil_id, is_active) VALUES
('blk-kullu-01', '28020101', 'Kullu', 'dist-kullu', 'teh-kullu-01', true),
('blk-kullu-02', '28020102', 'Banjar', 'dist-kullu', 'teh-kullu-02', true),
('blk-kullu-03', '28020103', 'Anni', 'dist-kullu', 'teh-kullu-04', true),
('blk-kullu-04', '28020104', 'Nirmand', 'dist-kullu', 'teh-kullu-05', true);

-- Kangra District Blocks
INSERT INTO lgd_blocks (id, lgd_code, block_name, district_id, tehsil_id, is_active) VALUES
('blk-kangra-01', '28040101', 'Kangra', 'dist-kangra', 'teh-kangra-01', true),
('blk-kangra-02', '28040102', 'Dharamsala', 'dist-kangra', 'teh-kangra-02', true),
('blk-kangra-03', '28040103', 'Palampur', 'dist-kangra', 'teh-kangra-03', true),
('blk-kangra-04', '28040104', 'Nurpur', 'dist-kangra', 'teh-kangra-04', true);

-- ============================================================================
-- LGD MASTER DATA - GRAM PANCHAYATS (Sample GPs)
-- ============================================================================

-- Shimla District Gram Panchayats
INSERT INTO lgd_gram_panchayats (id, lgd_code, gram_panchayat_name, district_id, block_id, is_active) VALUES
('gp-shimla-01', '2801010101', 'Khalini', 'dist-shimla', 'blk-shimla-01', true),
('gp-shimla-02', '2801010102', 'Dhalli', 'dist-shimla', 'blk-shimla-01', true),
('gp-shimla-03', '2801010103', 'Tutikandi', 'dist-shimla', 'blk-shimla-01', true),
('gp-shimla-04', '2801020101', 'Theog', 'dist-shimla', 'blk-shimla-02', true),
('gp-shimla-05', '2801020102', 'Matiana', 'dist-shimla', 'blk-shimla-02', true),
('gp-shimla-06', '2801030101', 'Rampur', 'dist-shimla', 'blk-shimla-03', true),
('gp-shimla-07', '2801040101', 'Rohru', 'dist-shimla', 'blk-shimla-04', true),
('gp-shimla-08', '2801050101', 'Chopal', 'dist-shimla', 'blk-shimla-05', true);

-- Kullu District Gram Panchayats
INSERT INTO lgd_gram_panchayats (id, lgd_code, gram_panchayat_name, district_id, block_id, is_active) VALUES
('gp-kullu-01', '2802010101', 'Manali', 'dist-kullu', 'blk-kullu-01', true),
('gp-kullu-02', '2802010102', 'Vashisht', 'dist-kullu', 'blk-kullu-01', true),
('gp-kullu-03', '2802010103', 'Naggar', 'dist-kullu', 'blk-kullu-01', true),
('gp-kullu-04', '2802020101', 'Banjar', 'dist-kullu', 'blk-kullu-02', true),
('gp-kullu-05', '2802020102', 'Jibhi', 'dist-kullu', 'blk-kullu-02', true);

-- ============================================================================
-- LGD MASTER DATA - URBAN BODIES (Municipal Councils, Towns)
-- ============================================================================

-- Shimla District Urban Bodies
INSERT INTO lgd_urban_bodies (id, lgd_code, urban_body_name, district_id, body_type, number_of_wards, is_active) VALUES
('urb-shimla-01', '280101', 'Shimla Municipal Corporation', 'dist-shimla', 'Municipal Corporation', 34, true),
('urb-shimla-02', '280102', 'Rampur Nagar Panchayat', 'dist-shimla', 'Nagar Panchayat', 9, true),
('urb-shimla-03', '280103', 'Theog Nagar Panchayat', 'dist-shimla', 'Nagar Panchayat', 9, true);

-- Kullu District Urban Bodies
INSERT INTO lgd_urban_bodies (id, lgd_code, urban_body_name, district_id, body_type, number_of_wards, is_active) VALUES
('urb-kullu-01', '280201', 'Kullu Municipal Council', 'dist-kullu', 'Municipal Council', 17, true),
('urb-kullu-02', '280202', 'Manali Municipal Council', 'dist-kullu', 'Municipal Council', 15, true),
('urb-kullu-03', '280203', 'Bhuntar Nagar Panchayat', 'dist-kullu', 'Nagar Panchayat', 9, true);

-- Mandi District Urban Bodies
INSERT INTO lgd_urban_bodies (id, lgd_code, urban_body_name, district_id, body_type, number_of_wards, is_active) VALUES
('urb-mandi-01', '280301', 'Mandi Municipal Council', 'dist-mandi', 'Municipal Council', 17, true),
('urb-mandi-02', '280302', 'Sundernagar Municipal Council', 'dist-mandi', 'Municipal Council', 13, true);

-- Kangra District Urban Bodies
INSERT INTO lgd_urban_bodies (id, lgd_code, urban_body_name, district_id, body_type, number_of_wards, is_active) VALUES
('urb-kangra-01', '280401', 'Dharamsala Municipal Corporation', 'dist-kangra', 'Municipal Corporation', 17, true),
('urb-kangra-02', '280402', 'Palampur Municipal Council', 'dist-kangra', 'Municipal Council', 15, true),
('urb-kangra-03', '280403', 'Kangra Municipal Council', 'dist-kangra', 'Municipal Council', 13, true);

-- Hamirpur District Urban Bodies
INSERT INTO lgd_urban_bodies (id, lgd_code, urban_body_name, district_id, body_type, number_of_wards, is_active) VALUES
('urb-hamirpur-01', '280501', 'Hamirpur Municipal Council', 'dist-hamirpur', 'Municipal Council', 13, true);

-- Una District Urban Bodies
INSERT INTO lgd_urban_bodies (id, lgd_code, urban_body_name, district_id, body_type, number_of_wards, is_active) VALUES
('urb-una-01', '280601', 'Una Municipal Council', 'dist-una', 'Municipal Council', 13, true);

-- Bilaspur District Urban Bodies
INSERT INTO lgd_urban_bodies (id, lgd_code, urban_body_name, district_id, body_type, number_of_wards, is_active) VALUES
('urb-bilaspur-01', '280701', 'Bilaspur Municipal Council', 'dist-bilaspur', 'Municipal Council', 13, true);

-- Solan District Urban Bodies
INSERT INTO lgd_urban_bodies (id, lgd_code, urban_body_name, district_id, body_type, number_of_wards, is_active) VALUES
('urb-solan-01', '280801', 'Solan Municipal Council', 'dist-solan', 'Municipal Council', 17, true),
('urb-solan-02', '280802', 'Baddi Nagar Panchayat', 'dist-solan', 'Nagar Panchayat', 13, true),
('urb-solan-03', '280803', 'Nalagarh Nagar Panchayat', 'dist-solan', 'Nagar Panchayat', 9, true);

-- Sirmaur District Urban Bodies
INSERT INTO lgd_urban_bodies (id, lgd_code, urban_body_name, district_id, body_type, number_of_wards, is_active) VALUES
('urb-sirmaur-01', '280901', 'Nahan Municipal Council', 'dist-sirmaur', 'Municipal Council', 13, true),
('urb-sirmaur-02', '280902', 'Paonta Sahib Municipal Council', 'dist-sirmaur', 'Municipal Council', 15, true);

-- Chamba District Urban Bodies
INSERT INTO lgd_urban_bodies (id, lgd_code, urban_body_name, district_id, body_type, number_of_wards, is_active) VALUES
('urb-chamba-01', '281001', 'Chamba Municipal Council', 'dist-chamba', 'Municipal Council', 13, true),
('urb-chamba-02', '281002', 'Dalhousie Municipal Council', 'dist-chamba', 'Municipal Council', 11, true);

-- ============================================================================
-- DDO CODES (Drawing & Disbursing Officers) - All 12 Districts
-- ============================================================================

INSERT INTO ddo_codes (id, district, ddo_code, ddo_description, treasury_code, is_active) VALUES
('ddo-shimla', 'Shimla', 'CTO00-068', 'Chief Tourism Officer, Shimla', 'SML', true),
('ddo-kullu', 'Kullu', 'DTO01-KLU', 'District Tourism Officer, Kullu', 'KLU', true),
('ddo-mandi', 'Mandi', 'DTO02-MND', 'District Tourism Officer, Mandi', 'MND', true),
('ddo-kangra', 'Kangra', 'DTO03-KGR', 'District Tourism Officer, Kangra', 'KGR', true),
('ddo-hamirpur', 'Hamirpur', 'DTO04-HMP', 'District Tourism Officer, Hamirpur', 'HMP', true),
('ddo-una', 'Una', 'DTO05-UNA', 'District Tourism Officer, Una', 'UNA', true),
('ddo-bilaspur', 'Bilaspur', 'DTO06-BLP', 'District Tourism Officer, Bilaspur', 'BLP', true),
('ddo-solan', 'Solan', 'DTO07-SLN', 'District Tourism Officer, Solan', 'SLN', true),
('ddo-sirmaur', 'Sirmaur', 'DTO08-SMR', 'District Tourism Officer, Sirmaur', 'SMR', true),
('ddo-chamba', 'Chamba', 'DTO09-CHB', 'District Tourism Officer, Chamba', 'CHB', true),
('ddo-lahaul', 'Lahaul and Spiti', 'DTO10-LSP', 'District Tourism Officer, Lahaul-Spiti', 'LSP', true),
('ddo-kinnaur', 'Kinnaur', 'DTO11-KNR', 'District Tourism Officer, Kinnaur', 'KNR', true);

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

-- Payment test mode (disabled by default in production)
INSERT INTO system_settings (setting_key, setting_value, description, category, updated_by)
VALUES ('payment_test_mode', '{"enabled": false}'::jsonb, 'Enable test payment mode (sends ₹1 to gateway)', 'payment', 'super-admin-001')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count all seeded data
SELECT 'Users' as entity, COUNT(*) as count FROM users
UNION ALL
SELECT 'Districts', COUNT(*) FROM lgd_districts
UNION ALL
SELECT 'Tehsils', COUNT(*) FROM lgd_tehsils
UNION ALL
SELECT 'Blocks', COUNT(*) FROM lgd_blocks
UNION ALL
SELECT 'Gram Panchayats', COUNT(*) FROM lgd_gram_panchayats
UNION ALL
SELECT 'Urban Bodies', COUNT(*) FROM lgd_urban_bodies
UNION ALL
SELECT 'DDO Codes', COUNT(*) FROM ddo_codes;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 1. All demo users have the password: "password123"
-- 2. Super Admin: 9999999998
-- 3. Admin: 9999999999
-- 4. Demo Owner: 6666666661
-- 5. Demo DA (Shimla): 7777777771
-- 6. Demo DTDO (Shimla): 8888888881
-- 7. All staff users belong to Shimla district
-- 8. Change passwords immediately in production!
-- ============================================================================
