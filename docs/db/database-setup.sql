-- ============================================================================
-- HP Tourism Digital Ecosystem - Complete Database Schema
-- PostgreSQL 13+ Required
-- ============================================================================
-- This script creates all tables for the HP Tourism eServices portal
-- Run this on a fresh PostgreSQL database to set up the complete schema
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    mobile varchar(15) NOT NULL UNIQUE,
    full_name text NOT NULL,
    first_name varchar(100),
    last_name varchar(100),
    username varchar(50),
    email varchar(255),
    alternate_phone varchar(15),
    designation varchar(100),
    department varchar(100),
    employee_id varchar(50),
    office_address text,
    office_phone varchar(15),
    role varchar(50) DEFAULT 'property_owner' NOT NULL,
    aadhaar_number varchar(12) UNIQUE,
    district varchar(100),
    password text,
    is_active boolean DEFAULT true,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE user_profiles (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE cascade,
    full_name varchar(255) NOT NULL,
    gender varchar(10) NOT NULL,
    aadhaar_number varchar(12),
    mobile varchar(15) NOT NULL,
    email varchar(255),
    district varchar(100),
    tehsil varchar(100),
    block varchar(100),
    gram_panchayat varchar(100),
    urban_body varchar(200),
    ward varchar(50),
    address text,
    pincode varchar(10),
    telephone varchar(20),
    fax varchar(20),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- ============================================================================
-- LGD MASTER DATA (Local Government Directory)
-- ============================================================================

CREATE TABLE lgd_districts (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    lgd_code varchar(20) UNIQUE,
    district_name varchar(100) NOT NULL UNIQUE,
    division_name varchar(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE lgd_tehsils (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    lgd_code varchar(20) UNIQUE,
    tehsil_name varchar(100) NOT NULL,
    district_id varchar NOT NULL REFERENCES lgd_districts(id) ON DELETE cascade,
    tehsil_type varchar(50) DEFAULT 'tehsil',
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE lgd_blocks (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    lgd_code varchar(20) UNIQUE,
    block_name varchar(100) NOT NULL,
    district_id varchar NOT NULL REFERENCES lgd_districts(id) ON DELETE cascade,
    tehsil_id varchar REFERENCES lgd_tehsils(id) ON DELETE set null,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE lgd_gram_panchayats (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    lgd_code varchar(20) UNIQUE,
    gram_panchayat_name varchar(100) NOT NULL,
    district_id varchar NOT NULL REFERENCES lgd_districts(id) ON DELETE cascade,
    block_id varchar REFERENCES lgd_blocks(id) ON DELETE set null,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE lgd_urban_bodies (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    lgd_code varchar(20) UNIQUE,
    urban_body_name varchar(200) NOT NULL,
    district_id varchar NOT NULL REFERENCES lgd_districts(id) ON DELETE cascade,
    body_type varchar(50) NOT NULL,
    number_of_wards integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- ============================================================================
-- HOMESTAY APPLICATIONS (ANNEXURE-I Compliant)
-- ============================================================================

CREATE TABLE homestay_applications (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id varchar NOT NULL REFERENCES users(id),
    application_number varchar(50) NOT NULL UNIQUE,
    
    -- Property Details
    property_name varchar(255) NOT NULL,
    category varchar(20) NOT NULL,
    location_type varchar(10) NOT NULL,
    total_rooms integer NOT NULL,
    
    -- LGD Hierarchical Address
    district varchar(100) NOT NULL,
    district_other varchar(100),
    tehsil varchar(100) NOT NULL,
    tehsil_other varchar(100),
    block varchar(100),
    block_other varchar(100),
    gram_panchayat varchar(100),
    gram_panchayat_other varchar(100),
    urban_body varchar(200),
    urban_body_other varchar(200),
    ward varchar(50),
    address text NOT NULL,
    pincode varchar(10) NOT NULL,
    telephone varchar(20),
    fax varchar(20),
    latitude numeric(10, 8),
    longitude numeric(11, 8),
    
    -- Owner Details
    owner_name varchar(255) NOT NULL,
    owner_gender varchar(10) NOT NULL,
    owner_mobile varchar(15) NOT NULL,
    owner_email varchar(255),
    owner_aadhaar varchar(12) NOT NULL,
    property_ownership varchar(10) DEFAULT 'owned' NOT NULL,
    
    -- Room & Category Details
    proposed_room_rate numeric(10, 2),
    project_type varchar(20) NOT NULL,
    property_area numeric(10, 2) NOT NULL,
    
    -- 2025 Rules - Per Room Type
    single_bed_rooms integer DEFAULT 0,
    single_bed_room_size numeric(10, 2),
    single_bed_room_rate numeric(10, 2),
    double_bed_rooms integer DEFAULT 0,
    double_bed_room_size numeric(10, 2),
    double_bed_room_rate numeric(10, 2),
    family_suites integer DEFAULT 0,
    family_suite_size numeric(10, 2),
    family_suite_rate numeric(10, 2),
    attached_washrooms integer NOT NULL,
    gstin varchar(15),
    
    -- Category Selection & Rate Analysis
    selected_category varchar(20),
    average_room_rate numeric(10, 2),
    highest_room_rate numeric(10, 2),
    lowest_room_rate numeric(10, 2),
    
    -- Certificate Validity & Discounts
    certificate_validity_years integer DEFAULT 1,
    is_pangi_sub_division boolean DEFAULT false,
    
    -- Distances (ANNEXURE-I)
    distance_airport numeric(10, 2),
    distance_railway numeric(10, 2),
    distance_city_center numeric(10, 2),
    distance_shopping numeric(10, 2),
    distance_bus_stand numeric(10, 2),
    
    -- Public Areas
    lobby_area numeric(10, 2),
    dining_area numeric(10, 2),
    parking_area text,
    
    -- Additional Facilities
    eco_friendly_facilities text,
    differently_abled_facilities text,
    fire_equipment_details text,
    nearest_hospital varchar(255),
    
    -- Amenities and Room Details (JSONB)
    amenities jsonb,
    rooms jsonb,
    
    -- Fee Calculation (2025 Rules - GST Included)
    base_fee numeric(10, 2),
    total_before_discounts numeric(10, 2),
    validity_discount numeric(10, 2) DEFAULT '0',
    female_owner_discount numeric(10, 2) DEFAULT '0',
    pangi_discount numeric(10, 2) DEFAULT '0',
    total_discount numeric(10, 2) DEFAULT '0',
    total_fee numeric(10, 2),
    per_room_fee numeric(10, 2),
    gst_amount numeric(10, 2),
    
    -- Workflow Status
    status varchar(50) DEFAULT 'draft',
    current_stage varchar(50),
    current_page integer DEFAULT 1,
    
    -- Officer Assignments
    district_officer_id varchar REFERENCES users(id),
    district_review_date timestamp,
    district_notes text,
    da_id varchar REFERENCES users(id),
    da_review_date timestamp,
    da_forwarded_date timestamp,
    state_officer_id varchar REFERENCES users(id),
    state_review_date timestamp,
    state_notes text,
    dtdo_id varchar REFERENCES users(id),
    dtdo_review_date timestamp,
    dtdo_remarks text,
    
    rejection_reason text,
    clarification_requested text,
    
    -- Site Inspection
    site_inspection_scheduled_date timestamp,
    site_inspection_completed_date timestamp,
    site_inspection_officer_id varchar REFERENCES users(id),
    site_inspection_notes text,
    site_inspection_outcome varchar(50),
    site_inspection_findings jsonb,
    
    -- Legacy Document URLs
    ownership_proof_url text,
    aadhaar_card_url text,
    pan_card_url text,
    gst_certificate_url text,
    fire_safety_noc_url text,
    pollution_clearance_url text,
    building_plan_url text,
    property_photos_urls jsonb,
    
    -- ANNEXURE-II Documents (JSONB)
    documents jsonb,
    
    -- Certificate
    certificate_number varchar(50) UNIQUE,
    certificate_issued_date timestamp,
    certificate_expiry_date timestamp,
    
    -- Timestamps
    submitted_at timestamp,
    approved_at timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- ============================================================================
-- PRODUCTION-GRADE DOCUMENT MANAGEMENT
-- ============================================================================

CREATE TABLE documents (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    application_id varchar NOT NULL REFERENCES homestay_applications(id) ON DELETE cascade,
    document_type varchar(100) NOT NULL,
    file_name varchar(255) NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type varchar(100) NOT NULL,
    file_category varchar(50) DEFAULT 'document' NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    previous_version_id varchar REFERENCES documents(id) ON DELETE set null,
    is_latest_version boolean DEFAULT true,
    uploaded_by varchar REFERENCES users(id) ON DELETE set null,
    upload_date timestamp DEFAULT now(),
    status varchar(50) DEFAULT 'active' NOT NULL,
    is_deleted boolean DEFAULT false,
    deleted_by varchar REFERENCES users(id) ON DELETE set null,
    deleted_at timestamp,
    ai_verification_status varchar(50),
    ai_confidence_score numeric(5, 2),
    ai_notes text,
    is_verified boolean DEFAULT false,
    verification_status varchar(50) DEFAULT 'pending',
    verified_by varchar REFERENCES users(id) ON DELETE set null,
    verification_date timestamp,
    verification_notes text
);

CREATE TABLE document_audit_logs (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    document_id varchar NOT NULL REFERENCES documents(id) ON DELETE cascade,
    application_id varchar NOT NULL REFERENCES homestay_applications(id) ON DELETE cascade,
    action varchar(50) NOT NULL,
    action_by varchar NOT NULL REFERENCES users(id),
    action_at timestamp DEFAULT now(),
    user_role varchar(50),
    ip_address varchar(45),
    user_agent text,
    notes text
);

-- ============================================================================
-- INSPECTION SYSTEM (ANNEXURE-III)
-- ============================================================================

CREATE TABLE inspection_orders (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    application_id varchar NOT NULL REFERENCES homestay_applications(id) ON DELETE cascade,
    scheduled_by varchar NOT NULL REFERENCES users(id),
    scheduled_date timestamp NOT NULL,
    assigned_to varchar NOT NULL REFERENCES users(id),
    assigned_date timestamp NOT NULL,
    inspection_date timestamp NOT NULL,
    inspection_address text NOT NULL,
    special_instructions text,
    status varchar(50) DEFAULT 'scheduled',
    dtdo_notes text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE inspection_reports (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    inspection_order_id varchar NOT NULL REFERENCES inspection_orders(id) ON DELETE cascade,
    application_id varchar NOT NULL REFERENCES homestay_applications(id) ON DELETE cascade,
    submitted_by varchar NOT NULL REFERENCES users(id),
    submitted_date timestamp NOT NULL,
    actual_inspection_date timestamp NOT NULL,
    room_count_verified boolean NOT NULL,
    actual_room_count integer,
    category_meets_standards boolean NOT NULL,
    recommended_category varchar(20),
    mandatory_checklist jsonb,
    mandatory_remarks text,
    desirable_checklist jsonb,
    desirable_remarks text,
    amenities_verified jsonb,
    amenities_issues text,
    fire_safety_compliant boolean,
    fire_safety_issues text,
    structural_safety boolean,
    structural_issues text,
    overall_satisfactory boolean NOT NULL,
    recommendation varchar(50) NOT NULL,
    detailed_findings text NOT NULL,
    inspection_photos jsonb,
    report_document_url text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- ============================================================================
-- OBJECTIONS & CLARIFICATIONS
-- ============================================================================

CREATE TABLE objections (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    application_id varchar NOT NULL REFERENCES homestay_applications(id) ON DELETE cascade,
    inspection_report_id varchar REFERENCES inspection_reports(id) ON DELETE set null,
    raised_by varchar NOT NULL REFERENCES users(id),
    raised_date timestamp NOT NULL,
    objection_type varchar(50) NOT NULL,
    objection_title varchar(255) NOT NULL,
    objection_description text NOT NULL,
    severity varchar(20) NOT NULL,
    response_deadline timestamp,
    status varchar(50) DEFAULT 'pending',
    resolution_notes text,
    resolved_by varchar REFERENCES users(id),
    resolved_date timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE clarifications (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    objection_id varchar NOT NULL REFERENCES objections(id) ON DELETE cascade,
    application_id varchar NOT NULL REFERENCES homestay_applications(id) ON DELETE cascade,
    submitted_by varchar NOT NULL REFERENCES users(id),
    submitted_date timestamp NOT NULL,
    clarification_text text NOT NULL,
    supporting_documents jsonb,
    reviewed_by varchar REFERENCES users(id),
    reviewed_date timestamp,
    review_status varchar(50),
    review_notes text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- ============================================================================
-- PAYMENT GATEWAYS
-- ============================================================================

CREATE TABLE himkosh_transactions (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    application_id varchar NOT NULL REFERENCES homestay_applications(id),
    dept_ref_no varchar(45) NOT NULL,
    app_ref_no varchar(20) NOT NULL UNIQUE,
    total_amount integer NOT NULL,
    tender_by varchar(70) NOT NULL,
    merchant_code varchar(15),
    dept_id varchar(10),
    service_code varchar(5),
    ddo varchar(12),
    head1 varchar(14),
    amount1 integer,
    head2 varchar(14),
    amount2 integer,
    head3 varchar(14),
    amount3 integer,
    head4 varchar(14),
    amount4 integer,
    head10 varchar(50),
    amount10 integer,
    period_from varchar(10),
    period_to varchar(10),
    encrypted_request text,
    request_checksum varchar(32),
    ech_txn_id varchar(10) UNIQUE,
    bank_cin varchar(20),
    bank_name varchar(10),
    payment_date varchar(14),
    status varchar(70),
    status_cd varchar(1),
    response_checksum varchar(32),
    is_double_verified boolean DEFAULT false,
    double_verification_date timestamp,
    double_verification_data jsonb,
    challan_print_url text,
    transaction_status varchar(50) DEFAULT 'initiated',
    initiated_at timestamp DEFAULT now(),
    responded_at timestamp,
    verified_at timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE payments (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    application_id varchar NOT NULL REFERENCES homestay_applications(id),
    payment_type varchar(50) NOT NULL,
    amount numeric(10, 2) NOT NULL,
    payment_gateway varchar(50),
    gateway_transaction_id varchar(255) UNIQUE,
    payment_method varchar(50),
    payment_status varchar(50) DEFAULT 'pending',
    payment_link text,
    qr_code_url text,
    payment_link_expiry_date timestamp,
    initiated_at timestamp DEFAULT now(),
    completed_at timestamp,
    receipt_number varchar(100) UNIQUE,
    receipt_url text
);

CREATE TABLE ddo_codes (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    district varchar(100) NOT NULL UNIQUE,
    ddo_code varchar(20) NOT NULL,
    ddo_description text NOT NULL,
    treasury_code varchar(10) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- ============================================================================
-- CERTIFICATES
-- ============================================================================

CREATE TABLE certificates (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    application_id varchar NOT NULL UNIQUE REFERENCES homestay_applications(id) ON DELETE cascade,
    certificate_number varchar(50) NOT NULL UNIQUE,
    certificate_type varchar(50) DEFAULT 'homestay_registration',
    issued_date timestamp NOT NULL,
    valid_from timestamp NOT NULL,
    valid_upto timestamp NOT NULL,
    property_name varchar(255) NOT NULL,
    category varchar(20) NOT NULL,
    address text NOT NULL,
    district varchar(100) NOT NULL,
    owner_name varchar(255) NOT NULL,
    owner_mobile varchar(15) NOT NULL,
    certificate_pdf_url text,
    qr_code_data text,
    digital_signature text,
    issued_by varchar REFERENCES users(id),
    status varchar(50) DEFAULT 'active',
    revocation_reason text,
    revoked_by varchar REFERENCES users(id),
    revoked_date timestamp,
    renewal_reminder_sent boolean DEFAULT false,
    renewal_application_id varchar REFERENCES homestay_applications(id),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- ============================================================================
-- NOTIFICATIONS & TRACKING
-- ============================================================================

CREATE TABLE notifications (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE cascade,
    application_id varchar REFERENCES homestay_applications(id) ON DELETE cascade,
    type varchar(100) NOT NULL,
    title varchar(255) NOT NULL,
    message text NOT NULL,
    channels jsonb,
    is_read boolean DEFAULT false,
    read_at timestamp,
    created_at timestamp DEFAULT now()
);

CREATE TABLE application_actions (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    application_id varchar NOT NULL REFERENCES homestay_applications(id) ON DELETE cascade,
    officer_id varchar NOT NULL REFERENCES users(id),
    action varchar(50) NOT NULL,
    previous_status varchar(50),
    new_status varchar(50),
    feedback text,
    issues_found jsonb,
    created_at timestamp DEFAULT now()
);

CREATE TABLE audit_logs (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id varchar REFERENCES users(id),
    action varchar(100) NOT NULL,
    details jsonb,
    ip_address varchar(45),
    user_agent text,
    created_at timestamp DEFAULT now()
);

-- ============================================================================
-- PUBLIC PORTAL
-- ============================================================================

CREATE TABLE reviews (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    application_id varchar NOT NULL REFERENCES homestay_applications(id) ON DELETE cascade,
    user_id varchar NOT NULL REFERENCES users(id),
    rating integer NOT NULL,
    review_text text,
    is_verified_stay boolean DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE production_stats (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    total_applications integer NOT NULL,
    approved_applications integer NOT NULL,
    rejected_applications integer NOT NULL,
    pending_applications integer NOT NULL,
    scraped_at timestamp DEFAULT now(),
    source_url text
);

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

CREATE TABLE system_settings (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    setting_key varchar(100) NOT NULL UNIQUE,
    setting_value jsonb NOT NULL,
    description text,
    category varchar(50) DEFAULT 'general',
    updated_by varchar REFERENCES users(id),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User lookups
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_district ON users(district);

-- Application lookups
CREATE INDEX idx_applications_user_id ON homestay_applications(user_id);
CREATE INDEX idx_applications_status ON homestay_applications(status);
CREATE INDEX idx_applications_district ON homestay_applications(district);
CREATE INDEX idx_applications_category ON homestay_applications(category);
CREATE INDEX idx_applications_app_number ON homestay_applications(application_number);

-- Document lookups
CREATE INDEX idx_documents_application_id ON documents(application_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);

-- LGD hierarchical queries
CREATE INDEX idx_lgd_tehsils_district ON lgd_tehsils(district_id);
CREATE INDEX idx_lgd_blocks_district ON lgd_blocks(district_id);
CREATE INDEX idx_lgd_blocks_tehsil ON lgd_blocks(tehsil_id);
CREATE INDEX idx_lgd_gps_district ON lgd_gram_panchayats(district_id);
CREATE INDEX idx_lgd_gps_block ON lgd_gram_panchayats(block_id);
CREATE INDEX idx_lgd_urban_district ON lgd_urban_bodies(district_id);

-- Payment lookups
CREATE INDEX idx_himkosh_application ON himkosh_transactions(application_id);
CREATE INDEX idx_himkosh_app_ref ON himkosh_transactions(app_ref_no);
CREATE INDEX idx_payments_application ON payments(application_id);

-- Notification lookups
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_application ON notifications(application_id);

-- Audit trail
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================================
-- INITIAL DATA (Optional - Remove if not needed)
-- ============================================================================

-- Insert default super admin (Change password immediately!)
INSERT INTO users (mobile, full_name, role, password, is_active) 
VALUES ('9999999999', 'Super Administrator', 'super_admin', '$2b$10$YourHashedPasswordHere', true)
ON CONFLICT (mobile) DO NOTHING;

-- Insert payment test mode setting
INSERT INTO system_settings (setting_key, setting_value, description, category)
VALUES ('payment_test_mode', '{"enabled": false}'::jsonb, 'Enable test payment mode (₹1 to gateway)', 'payment')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- GRANTS (Adjust based on your PostgreSQL user)
-- ============================================================================

-- Example: Grant all privileges to your application user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- View all tables and row counts
-- SELECT schemaname, tablename, n_live_tup as row_count 
-- FROM pg_stat_user_tables 
-- ORDER BY n_live_tup DESC;

-- Check database size
-- SELECT pg_size_pretty(pg_database_size(current_database()));

-- ============================================================================
-- BACKUP RECOMMENDATION
-- ============================================================================
-- Regular backups: pg_dump -U username -d dbname -F c -f backup_$(date +%Y%m%d).dump
-- Restore: pg_restore -U username -d dbname -c backup_20250103.dump
-- ============================================================================
