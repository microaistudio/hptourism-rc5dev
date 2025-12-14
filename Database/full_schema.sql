--
-- PostgreSQL database dump
--

\restrict 8n5abLdS6CZGs4YspqG5NvuwZWOdNt9BjKRValLkiUzhw7Q8O6AqWRTyrM5ge1l

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: hptourism_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO hptourism_user;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: hptourism_user
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: application_actions; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.application_actions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    application_id character varying NOT NULL,
    officer_id character varying NOT NULL,
    action character varying(50) NOT NULL,
    previous_status character varying(50),
    new_status character varying(50),
    feedback text,
    issues_found jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.application_actions OWNER TO hptourism_user;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.audit_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    action character varying(100) NOT NULL,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO hptourism_user;

--
-- Name: certificates; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.certificates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    application_id character varying NOT NULL,
    certificate_number character varying(50) NOT NULL,
    certificate_type character varying(50) DEFAULT 'homestay_registration'::character varying,
    issued_date timestamp without time zone NOT NULL,
    valid_from timestamp without time zone NOT NULL,
    valid_upto timestamp without time zone NOT NULL,
    property_name character varying(255) NOT NULL,
    category character varying(20) NOT NULL,
    address text NOT NULL,
    district character varying(100) NOT NULL,
    owner_name character varying(255) NOT NULL,
    owner_mobile character varying(15) NOT NULL,
    certificate_pdf_url text,
    qr_code_data text,
    digital_signature text,
    issued_by character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    revocation_reason text,
    revoked_by character varying,
    revoked_date timestamp without time zone,
    renewal_reminder_sent boolean DEFAULT false,
    renewal_application_id character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.certificates OWNER TO hptourism_user;

--
-- Name: clarifications; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.clarifications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    objection_id character varying NOT NULL,
    application_id character varying NOT NULL,
    submitted_by character varying NOT NULL,
    submitted_date timestamp without time zone NOT NULL,
    clarification_text text NOT NULL,
    supporting_documents jsonb,
    reviewed_by character varying,
    reviewed_date timestamp without time zone,
    review_status character varying(50),
    review_notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.clarifications OWNER TO hptourism_user;

--
-- Name: ddo_codes; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.ddo_codes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    district character varying(100) NOT NULL,
    ddo_code character varying(20) NOT NULL,
    ddo_description text NOT NULL,
    treasury_code character varying(10) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ddo_codes OWNER TO hptourism_user;

--
-- Name: document_audit_logs; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.document_audit_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    document_id character varying NOT NULL,
    application_id character varying NOT NULL,
    action character varying(50) NOT NULL,
    action_by character varying NOT NULL,
    action_at timestamp without time zone DEFAULT now(),
    user_role character varying(50),
    ip_address character varying(45),
    user_agent text,
    notes text
);


ALTER TABLE public.document_audit_logs OWNER TO hptourism_user;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.documents (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    application_id character varying NOT NULL,
    document_type character varying(100) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_category character varying(50) DEFAULT 'document'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    previous_version_id character varying,
    is_latest_version boolean DEFAULT true,
    uploaded_by character varying,
    upload_date timestamp without time zone DEFAULT now(),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    is_deleted boolean DEFAULT false,
    deleted_by character varying,
    deleted_at timestamp without time zone,
    ai_verification_status character varying(50),
    ai_confidence_score numeric(5,2),
    ai_notes text,
    is_verified boolean DEFAULT false,
    verification_status character varying(50) DEFAULT 'pending'::character varying,
    verified_by character varying,
    verification_date timestamp without time zone,
    verification_notes text
);


ALTER TABLE public.documents OWNER TO hptourism_user;

--
-- Name: himkosh_transactions; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.himkosh_transactions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    application_id character varying NOT NULL,
    dept_ref_no character varying(45) NOT NULL,
    app_ref_no character varying(20) NOT NULL,
    total_amount integer NOT NULL,
    tender_by character varying(70) NOT NULL,
    merchant_code character varying(15),
    dept_id character varying(10),
    service_code character varying(5),
    ddo character varying(12),
    head1 character varying(14),
    amount1 integer,
    head2 character varying(14),
    amount2 integer,
    head3 character varying(14),
    amount3 integer,
    head4 character varying(14),
    amount4 integer,
    head10 character varying(50),
    amount10 integer,
    period_from character varying(10),
    period_to character varying(10),
    encrypted_request text,
    request_checksum character varying(32),
    ech_txn_id character varying(10),
    bank_cin character varying(20),
    bank_name character varying(10),
    payment_date character varying(14),
    status character varying(70),
    status_cd character varying(1),
    response_checksum character varying(32),
    is_double_verified boolean DEFAULT false,
    double_verification_date timestamp without time zone,
    double_verification_data jsonb,
    challan_print_url text,
    transaction_status character varying(50) DEFAULT 'initiated'::character varying,
    initiated_at timestamp without time zone DEFAULT now(),
    responded_at timestamp without time zone,
    verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    portal_base_url text
);


ALTER TABLE public.himkosh_transactions OWNER TO hptourism_user;

--
-- Name: homestay_applications; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.homestay_applications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    application_number character varying(50) NOT NULL,
    property_name character varying(255) NOT NULL,
    category character varying(20) NOT NULL,
    location_type character varying(10) NOT NULL,
    total_rooms integer DEFAULT 0,
    district character varying(100) NOT NULL,
    district_other character varying(100),
    tehsil character varying(100) NOT NULL,
    tehsil_other character varying(100),
    block character varying(100),
    block_other character varying(100),
    gram_panchayat character varying(100),
    gram_panchayat_other character varying(100),
    urban_body character varying(200),
    urban_body_other character varying(200),
    ward character varying(50),
    address text NOT NULL,
    pincode character varying(10) NOT NULL,
    telephone character varying(20),
    fax character varying(20),
    latitude numeric(10,8),
    longitude numeric(11,8),
    owner_name character varying(255) NOT NULL,
    owner_gender character varying(10) NOT NULL,
    owner_mobile character varying(15) NOT NULL,
    owner_email character varying(255),
    owner_aadhaar character varying(12) NOT NULL,
    property_ownership character varying(10) DEFAULT 'owned'::character varying NOT NULL,
    proposed_room_rate numeric(10,2),
    project_type character varying(20) NOT NULL,
    property_area numeric(10,2) NOT NULL,
    single_bed_rooms integer DEFAULT 0,
    single_bed_room_size numeric(10,2),
    single_bed_room_rate numeric(10,2),
    double_bed_rooms integer DEFAULT 0,
    double_bed_room_size numeric(10,2),
    double_bed_room_rate numeric(10,2),
    family_suites integer DEFAULT 0,
    family_suite_size numeric(10,2),
    family_suite_rate numeric(10,2),
    attached_washrooms integer NOT NULL,
    gstin character varying(15),
    selected_category character varying(20),
    average_room_rate numeric(10,2),
    highest_room_rate numeric(10,2),
    lowest_room_rate numeric(10,2),
    certificate_validity_years integer DEFAULT 1,
    is_pangi_sub_division boolean DEFAULT false,
    distance_airport numeric(10,2),
    distance_railway numeric(10,2),
    distance_city_center numeric(10,2),
    distance_shopping numeric(10,2),
    distance_bus_stand numeric(10,2),
    lobby_area numeric(10,2),
    dining_area numeric(10,2),
    parking_area text,
    eco_friendly_facilities text,
    differently_abled_facilities text,
    fire_equipment_details text,
    nearest_hospital character varying(255),
    amenities jsonb,
    rooms jsonb,
    base_fee numeric(10,2),
    total_before_discounts numeric(10,2),
    validity_discount numeric(10,2) DEFAULT '0'::numeric,
    female_owner_discount numeric(10,2) DEFAULT '0'::numeric,
    pangi_discount numeric(10,2) DEFAULT '0'::numeric,
    total_discount numeric(10,2) DEFAULT '0'::numeric,
    total_fee numeric(10,2),
    per_room_fee numeric(10,2),
    gst_amount numeric(10,2),
    status character varying(50) DEFAULT 'draft'::character varying,
    current_stage character varying(50),
    current_page integer DEFAULT 1,
    district_officer_id character varying,
    district_review_date timestamp without time zone,
    district_notes text,
    da_id character varying,
    da_review_date timestamp without time zone,
    da_forwarded_date timestamp without time zone,
    state_officer_id character varying,
    state_review_date timestamp without time zone,
    state_notes text,
    dtdo_id character varying,
    dtdo_review_date timestamp without time zone,
    dtdo_remarks text,
    rejection_reason text,
    clarification_requested text,
    site_inspection_scheduled_date timestamp without time zone,
    site_inspection_completed_date timestamp without time zone,
    site_inspection_officer_id character varying,
    site_inspection_notes text,
    site_inspection_outcome character varying(50),
    site_inspection_findings jsonb,
    ownership_proof_url text,
    aadhaar_card_url text,
    pan_card_url text,
    gst_certificate_url text,
    fire_safety_noc_url text,
    pollution_clearance_url text,
    building_plan_url text,
    property_photos_urls jsonb,
    documents jsonb,
    certificate_number character varying(50),
    certificate_issued_date timestamp without time zone,
    certificate_expiry_date timestamp without time zone,
    submitted_at timestamp without time zone,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    single_bed_beds integer DEFAULT 1,
    double_bed_beds integer DEFAULT 2,
    family_suite_beds integer DEFAULT 4,
    application_kind character varying(30) DEFAULT 'new_registration'::character varying NOT NULL,
    parent_application_id character varying,
    parent_application_number character varying(50),
    parent_certificate_number character varying(50),
    inherited_certificate_valid_upto timestamp without time zone,
    service_context jsonb,
    service_notes text,
    service_requested_at timestamp without time zone,
    application_remarks jsonb,
    guardian_name character varying(255),
    da_remarks text,
    correction_submission_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.homestay_applications OWNER TO hptourism_user;

--
-- Name: inspection_orders; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.inspection_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    application_id character varying NOT NULL,
    scheduled_by character varying NOT NULL,
    scheduled_date timestamp without time zone NOT NULL,
    assigned_to character varying NOT NULL,
    assigned_date timestamp without time zone NOT NULL,
    inspection_date timestamp without time zone NOT NULL,
    inspection_address text NOT NULL,
    special_instructions text,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    dtdo_notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.inspection_orders OWNER TO hptourism_user;

--
-- Name: inspection_reports; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.inspection_reports (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    inspection_order_id character varying NOT NULL,
    application_id character varying NOT NULL,
    submitted_by character varying NOT NULL,
    submitted_date timestamp without time zone NOT NULL,
    actual_inspection_date timestamp without time zone NOT NULL,
    room_count_verified boolean NOT NULL,
    actual_room_count integer,
    category_meets_standards boolean NOT NULL,
    recommended_category character varying(20),
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
    recommendation character varying(50) NOT NULL,
    detailed_findings text NOT NULL,
    inspection_photos jsonb,
    report_document_url text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.inspection_reports OWNER TO hptourism_user;

--
-- Name: lgd_blocks; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.lgd_blocks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lgd_code character varying(20),
    block_name character varying(100) NOT NULL,
    district_id character varying NOT NULL,
    tehsil_id character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lgd_blocks OWNER TO hptourism_user;

--
-- Name: lgd_districts; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.lgd_districts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lgd_code character varying(20),
    district_name character varying(100) NOT NULL,
    division_name character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lgd_districts OWNER TO hptourism_user;

--
-- Name: lgd_gram_panchayats; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.lgd_gram_panchayats (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lgd_code character varying(20),
    gram_panchayat_name character varying(100) NOT NULL,
    district_id character varying NOT NULL,
    block_id character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lgd_gram_panchayats OWNER TO hptourism_user;

--
-- Name: lgd_tehsils; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.lgd_tehsils (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lgd_code character varying(20),
    tehsil_name character varying(100) NOT NULL,
    district_id character varying NOT NULL,
    tehsil_type character varying(50) DEFAULT 'tehsil'::character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lgd_tehsils OWNER TO hptourism_user;

--
-- Name: lgd_urban_bodies; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.lgd_urban_bodies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    lgd_code character varying(20),
    urban_body_name character varying(200) NOT NULL,
    district_id character varying NOT NULL,
    body_type character varying(50) NOT NULL,
    number_of_wards integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lgd_urban_bodies OWNER TO hptourism_user;

--
-- Name: login_otp_challenges; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.login_otp_challenges (
    id text DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    otp_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    consumed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.login_otp_challenges OWNER TO hptourism_user;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.notifications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    application_id character varying,
    type character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    channels jsonb,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO hptourism_user;

--
-- Name: objections; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.objections (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    application_id character varying NOT NULL,
    inspection_report_id character varying,
    raised_by character varying NOT NULL,
    raised_date timestamp without time zone NOT NULL,
    objection_type character varying(50) NOT NULL,
    objection_title character varying(255) NOT NULL,
    objection_description text NOT NULL,
    severity character varying(20) NOT NULL,
    response_deadline timestamp without time zone,
    status character varying(50) DEFAULT 'pending'::character varying,
    resolution_notes text,
    resolved_by character varying,
    resolved_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.objections OWNER TO hptourism_user;

--
-- Name: password_reset_challenges; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.password_reset_challenges (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    channel character varying(32) NOT NULL,
    recipient character varying(255),
    otp_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    consumed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.password_reset_challenges OWNER TO hptourism_user;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.payments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    application_id character varying NOT NULL,
    payment_type character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_gateway character varying(50),
    gateway_transaction_id character varying(255),
    payment_method character varying(50),
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    payment_link text,
    qr_code_url text,
    payment_link_expiry_date timestamp without time zone,
    initiated_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    receipt_number character varying(100),
    receipt_url text
);


ALTER TABLE public.payments OWNER TO hptourism_user;

--
-- Name: production_stats; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.production_stats (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    total_applications integer NOT NULL,
    approved_applications integer NOT NULL,
    rejected_applications integer NOT NULL,
    pending_applications integer NOT NULL,
    scraped_at timestamp without time zone DEFAULT now(),
    source_url text
);


ALTER TABLE public.production_stats OWNER TO hptourism_user;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.reviews (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    application_id character varying NOT NULL,
    user_id character varying NOT NULL,
    rating integer NOT NULL,
    review_text text,
    is_verified_stay boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.reviews OWNER TO hptourism_user;

--
-- Name: session; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO hptourism_user;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.system_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    category character varying(50) DEFAULT 'general'::character varying,
    updated_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO hptourism_user;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.user_profiles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    full_name character varying(255) NOT NULL,
    gender character varying(10) NOT NULL,
    aadhaar_number character varying(12),
    mobile character varying(15) NOT NULL,
    email character varying(255),
    district character varying(100),
    tehsil character varying(100),
    block character varying(100),
    gram_panchayat character varying(100),
    urban_body character varying(200),
    ward character varying(50),
    address text,
    pincode character varying(10),
    telephone character varying(20),
    fax character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_profiles OWNER TO hptourism_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: hptourism_user
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    mobile character varying(15) NOT NULL,
    full_name text NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    username character varying(50),
    email character varying(255),
    alternate_phone character varying(15),
    designation character varying(100),
    department character varying(100),
    employee_id character varying(50),
    office_address text,
    office_phone character varying(15),
    role character varying(50) DEFAULT 'property_owner'::character varying NOT NULL,
    aadhaar_number character varying(12),
    district character varying(100),
    password text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO hptourism_user;

--
-- Name: application_actions application_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.application_actions
    ADD CONSTRAINT application_actions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_application_id_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_application_id_key UNIQUE (application_id);


--
-- Name: certificates certificates_certificate_number_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_certificate_number_key UNIQUE (certificate_number);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: clarifications clarifications_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.clarifications
    ADD CONSTRAINT clarifications_pkey PRIMARY KEY (id);


--
-- Name: ddo_codes ddo_codes_district_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.ddo_codes
    ADD CONSTRAINT ddo_codes_district_key UNIQUE (district);


--
-- Name: ddo_codes ddo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.ddo_codes
    ADD CONSTRAINT ddo_codes_pkey PRIMARY KEY (id);


--
-- Name: document_audit_logs document_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.document_audit_logs
    ADD CONSTRAINT document_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: himkosh_transactions himkosh_transactions_app_ref_no_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.himkosh_transactions
    ADD CONSTRAINT himkosh_transactions_app_ref_no_key UNIQUE (app_ref_no);


--
-- Name: himkosh_transactions himkosh_transactions_ech_txn_id_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.himkosh_transactions
    ADD CONSTRAINT himkosh_transactions_ech_txn_id_key UNIQUE (ech_txn_id);


--
-- Name: himkosh_transactions himkosh_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.himkosh_transactions
    ADD CONSTRAINT himkosh_transactions_pkey PRIMARY KEY (id);


--
-- Name: homestay_applications homestay_applications_application_number_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.homestay_applications
    ADD CONSTRAINT homestay_applications_application_number_key UNIQUE (application_number);


--
-- Name: homestay_applications homestay_applications_certificate_number_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.homestay_applications
    ADD CONSTRAINT homestay_applications_certificate_number_key UNIQUE (certificate_number);


--
-- Name: homestay_applications homestay_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.homestay_applications
    ADD CONSTRAINT homestay_applications_pkey PRIMARY KEY (id);


--
-- Name: inspection_orders inspection_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.inspection_orders
    ADD CONSTRAINT inspection_orders_pkey PRIMARY KEY (id);


--
-- Name: inspection_reports inspection_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.inspection_reports
    ADD CONSTRAINT inspection_reports_pkey PRIMARY KEY (id);


--
-- Name: lgd_blocks lgd_blocks_lgd_code_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_blocks
    ADD CONSTRAINT lgd_blocks_lgd_code_key UNIQUE (lgd_code);


--
-- Name: lgd_blocks lgd_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_blocks
    ADD CONSTRAINT lgd_blocks_pkey PRIMARY KEY (id);


--
-- Name: lgd_districts lgd_districts_district_name_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_districts
    ADD CONSTRAINT lgd_districts_district_name_key UNIQUE (district_name);


--
-- Name: lgd_districts lgd_districts_lgd_code_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_districts
    ADD CONSTRAINT lgd_districts_lgd_code_key UNIQUE (lgd_code);


--
-- Name: lgd_districts lgd_districts_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_districts
    ADD CONSTRAINT lgd_districts_pkey PRIMARY KEY (id);


--
-- Name: lgd_gram_panchayats lgd_gram_panchayats_lgd_code_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_gram_panchayats
    ADD CONSTRAINT lgd_gram_panchayats_lgd_code_key UNIQUE (lgd_code);


--
-- Name: lgd_gram_panchayats lgd_gram_panchayats_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_gram_panchayats
    ADD CONSTRAINT lgd_gram_panchayats_pkey PRIMARY KEY (id);


--
-- Name: lgd_tehsils lgd_tehsils_lgd_code_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_tehsils
    ADD CONSTRAINT lgd_tehsils_lgd_code_key UNIQUE (lgd_code);


--
-- Name: lgd_tehsils lgd_tehsils_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_tehsils
    ADD CONSTRAINT lgd_tehsils_pkey PRIMARY KEY (id);


--
-- Name: lgd_urban_bodies lgd_urban_bodies_lgd_code_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_urban_bodies
    ADD CONSTRAINT lgd_urban_bodies_lgd_code_key UNIQUE (lgd_code);


--
-- Name: lgd_urban_bodies lgd_urban_bodies_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_urban_bodies
    ADD CONSTRAINT lgd_urban_bodies_pkey PRIMARY KEY (id);


--
-- Name: login_otp_challenges login_otp_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.login_otp_challenges
    ADD CONSTRAINT login_otp_challenges_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: objections objections_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.objections
    ADD CONSTRAINT objections_pkey PRIMARY KEY (id);


--
-- Name: password_reset_challenges password_reset_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.password_reset_challenges
    ADD CONSTRAINT password_reset_challenges_pkey PRIMARY KEY (id);


--
-- Name: payments payments_gateway_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_gateway_transaction_id_key UNIQUE (gateway_transaction_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_receipt_number_key UNIQUE (receipt_number);


--
-- Name: production_stats production_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.production_stats
    ADD CONSTRAINT production_stats_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: users users_aadhaar_number_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_aadhaar_number_key UNIQUE (aadhaar_number);


--
-- Name: users users_mobile_key; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_mobile_key UNIQUE (mobile);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: idx_applications_app_number; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_applications_app_number ON public.homestay_applications USING btree (application_number);


--
-- Name: idx_applications_category; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_applications_category ON public.homestay_applications USING btree (category);


--
-- Name: idx_applications_district; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_applications_district ON public.homestay_applications USING btree (district);


--
-- Name: idx_applications_status; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_applications_status ON public.homestay_applications USING btree (status);


--
-- Name: idx_applications_user_id; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_applications_user_id ON public.homestay_applications USING btree (user_id);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_documents_application_id; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_documents_application_id ON public.documents USING btree (application_id);


--
-- Name: idx_documents_document_type; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_documents_document_type ON public.documents USING btree (document_type);


--
-- Name: idx_documents_status; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_documents_status ON public.documents USING btree (status);


--
-- Name: idx_himkosh_app_ref; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_himkosh_app_ref ON public.himkosh_transactions USING btree (app_ref_no);


--
-- Name: idx_himkosh_application; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_himkosh_application ON public.himkosh_transactions USING btree (application_id);


--
-- Name: idx_lgd_blocks_district; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_blocks_district ON public.lgd_blocks USING btree (district_id);


--
-- Name: idx_lgd_blocks_tehsil; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_blocks_tehsil ON public.lgd_blocks USING btree (tehsil_id);


--
-- Name: idx_lgd_gps_block; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_gps_block ON public.lgd_gram_panchayats USING btree (block_id);


--
-- Name: idx_lgd_gps_district; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_gps_district ON public.lgd_gram_panchayats USING btree (district_id);


--
-- Name: idx_lgd_tehsils_district; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_tehsils_district ON public.lgd_tehsils USING btree (district_id);


--
-- Name: idx_lgd_urban_district; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_lgd_urban_district ON public.lgd_urban_bodies USING btree (district_id);


--
-- Name: idx_notifications_application; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_notifications_application ON public.notifications USING btree (application_id);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_password_reset_challenges_expires_at; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_password_reset_challenges_expires_at ON public.password_reset_challenges USING btree (expires_at);


--
-- Name: idx_password_reset_challenges_user_id; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_password_reset_challenges_user_id ON public.password_reset_challenges USING btree (user_id);


--
-- Name: idx_payments_application; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_payments_application ON public.payments USING btree (application_id);


--
-- Name: idx_users_district; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_users_district ON public.users USING btree (district);


--
-- Name: idx_users_mobile; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_users_mobile ON public.users USING btree (mobile);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: hptourism_user
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: application_actions application_actions_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.application_actions
    ADD CONSTRAINT application_actions_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id) ON DELETE CASCADE;


--
-- Name: application_actions application_actions_officer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.application_actions
    ADD CONSTRAINT application_actions_officer_id_fkey FOREIGN KEY (officer_id) REFERENCES public.users(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: certificates certificates_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id);


--
-- Name: certificates certificates_renewal_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_renewal_application_id_fkey FOREIGN KEY (renewal_application_id) REFERENCES public.homestay_applications(id);


--
-- Name: certificates certificates_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id);


--
-- Name: clarifications clarifications_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.clarifications
    ADD CONSTRAINT clarifications_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id) ON DELETE CASCADE;


--
-- Name: clarifications clarifications_objection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.clarifications
    ADD CONSTRAINT clarifications_objection_id_fkey FOREIGN KEY (objection_id) REFERENCES public.objections(id) ON DELETE CASCADE;


--
-- Name: clarifications clarifications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.clarifications
    ADD CONSTRAINT clarifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: clarifications clarifications_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.clarifications
    ADD CONSTRAINT clarifications_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: document_audit_logs document_audit_logs_action_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.document_audit_logs
    ADD CONSTRAINT document_audit_logs_action_by_fkey FOREIGN KEY (action_by) REFERENCES public.users(id);


--
-- Name: document_audit_logs document_audit_logs_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.document_audit_logs
    ADD CONSTRAINT document_audit_logs_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id) ON DELETE CASCADE;


--
-- Name: document_audit_logs document_audit_logs_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.document_audit_logs
    ADD CONSTRAINT document_audit_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents documents_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id) ON DELETE CASCADE;


--
-- Name: documents documents_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documents documents_previous_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_previous_version_id_fkey FOREIGN KEY (previous_version_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documents documents_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: himkosh_transactions himkosh_transactions_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.himkosh_transactions
    ADD CONSTRAINT himkosh_transactions_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id);


--
-- Name: homestay_applications homestay_applications_da_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.homestay_applications
    ADD CONSTRAINT homestay_applications_da_id_fkey FOREIGN KEY (da_id) REFERENCES public.users(id);


--
-- Name: homestay_applications homestay_applications_district_officer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.homestay_applications
    ADD CONSTRAINT homestay_applications_district_officer_id_fkey FOREIGN KEY (district_officer_id) REFERENCES public.users(id);


--
-- Name: homestay_applications homestay_applications_dtdo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.homestay_applications
    ADD CONSTRAINT homestay_applications_dtdo_id_fkey FOREIGN KEY (dtdo_id) REFERENCES public.users(id);


--
-- Name: homestay_applications homestay_applications_parent_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.homestay_applications
    ADD CONSTRAINT homestay_applications_parent_application_id_fkey FOREIGN KEY (parent_application_id) REFERENCES public.homestay_applications(id) ON DELETE SET NULL;


--
-- Name: homestay_applications homestay_applications_site_inspection_officer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.homestay_applications
    ADD CONSTRAINT homestay_applications_site_inspection_officer_id_fkey FOREIGN KEY (site_inspection_officer_id) REFERENCES public.users(id);


--
-- Name: homestay_applications homestay_applications_state_officer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.homestay_applications
    ADD CONSTRAINT homestay_applications_state_officer_id_fkey FOREIGN KEY (state_officer_id) REFERENCES public.users(id);


--
-- Name: homestay_applications homestay_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.homestay_applications
    ADD CONSTRAINT homestay_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: inspection_orders inspection_orders_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.inspection_orders
    ADD CONSTRAINT inspection_orders_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id) ON DELETE CASCADE;


--
-- Name: inspection_orders inspection_orders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.inspection_orders
    ADD CONSTRAINT inspection_orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: inspection_orders inspection_orders_scheduled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.inspection_orders
    ADD CONSTRAINT inspection_orders_scheduled_by_fkey FOREIGN KEY (scheduled_by) REFERENCES public.users(id);


--
-- Name: inspection_reports inspection_reports_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.inspection_reports
    ADD CONSTRAINT inspection_reports_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id) ON DELETE CASCADE;


--
-- Name: inspection_reports inspection_reports_inspection_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.inspection_reports
    ADD CONSTRAINT inspection_reports_inspection_order_id_fkey FOREIGN KEY (inspection_order_id) REFERENCES public.inspection_orders(id) ON DELETE CASCADE;


--
-- Name: inspection_reports inspection_reports_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.inspection_reports
    ADD CONSTRAINT inspection_reports_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: lgd_blocks lgd_blocks_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_blocks
    ADD CONSTRAINT lgd_blocks_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.lgd_districts(id) ON DELETE CASCADE;


--
-- Name: lgd_blocks lgd_blocks_tehsil_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_blocks
    ADD CONSTRAINT lgd_blocks_tehsil_id_fkey FOREIGN KEY (tehsil_id) REFERENCES public.lgd_tehsils(id) ON DELETE SET NULL;


--
-- Name: lgd_gram_panchayats lgd_gram_panchayats_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_gram_panchayats
    ADD CONSTRAINT lgd_gram_panchayats_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.lgd_blocks(id) ON DELETE SET NULL;


--
-- Name: lgd_gram_panchayats lgd_gram_panchayats_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_gram_panchayats
    ADD CONSTRAINT lgd_gram_panchayats_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.lgd_districts(id) ON DELETE CASCADE;


--
-- Name: lgd_tehsils lgd_tehsils_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_tehsils
    ADD CONSTRAINT lgd_tehsils_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.lgd_districts(id) ON DELETE CASCADE;


--
-- Name: lgd_urban_bodies lgd_urban_bodies_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.lgd_urban_bodies
    ADD CONSTRAINT lgd_urban_bodies_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.lgd_districts(id) ON DELETE CASCADE;


--
-- Name: login_otp_challenges login_otp_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.login_otp_challenges
    ADD CONSTRAINT login_otp_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: objections objections_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.objections
    ADD CONSTRAINT objections_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id) ON DELETE CASCADE;


--
-- Name: objections objections_inspection_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.objections
    ADD CONSTRAINT objections_inspection_report_id_fkey FOREIGN KEY (inspection_report_id) REFERENCES public.inspection_reports(id) ON DELETE SET NULL;


--
-- Name: objections objections_raised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.objections
    ADD CONSTRAINT objections_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.users(id);


--
-- Name: objections objections_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.objections
    ADD CONSTRAINT objections_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: password_reset_challenges password_reset_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.password_reset_challenges
    ADD CONSTRAINT password_reset_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id);


--
-- Name: reviews reviews_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.homestay_applications(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hptourism_user
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: hptourism_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict 8n5abLdS6CZGs4YspqG5NvuwZWOdNt9BjKRValLkiUzhw7Q8O6AqWRTyrM5ge1l

