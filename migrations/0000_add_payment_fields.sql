CREATE TABLE "application_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"officer_id" varchar NOT NULL,
	"action" varchar(50) NOT NULL,
	"previous_status" varchar(50),
	"new_status" varchar(50),
	"feedback" text,
	"issues_found" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"action" varchar(100) NOT NULL,
	"details" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"certificate_number" varchar(50) NOT NULL,
	"certificate_type" varchar(50) DEFAULT 'homestay_registration',
	"issued_date" timestamp NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_upto" timestamp NOT NULL,
	"property_name" varchar(255) NOT NULL,
	"category" varchar(20) NOT NULL,
	"address" text NOT NULL,
	"district" varchar(100) NOT NULL,
	"owner_name" varchar(255) NOT NULL,
	"owner_mobile" varchar(15) NOT NULL,
	"certificate_pdf_url" text,
	"qr_code_data" text,
	"digital_signature" text,
	"issued_by" varchar,
	"status" varchar(50) DEFAULT 'active',
	"revocation_reason" text,
	"revoked_by" varchar,
	"revoked_date" timestamp,
	"renewal_reminder_sent" boolean DEFAULT false,
	"renewal_application_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "certificates_application_id_unique" UNIQUE("application_id"),
	CONSTRAINT "certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "clarifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objection_id" varchar NOT NULL,
	"application_id" varchar NOT NULL,
	"submitted_by" varchar NOT NULL,
	"submitted_date" timestamp NOT NULL,
	"clarification_text" text NOT NULL,
	"supporting_documents" jsonb,
	"reviewed_by" varchar,
	"reviewed_date" timestamp,
	"review_status" varchar(50),
	"review_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ddo_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district" varchar(100) NOT NULL,
	"ddo_code" varchar(20) NOT NULL,
	"ddo_description" text NOT NULL,
	"treasury_code" varchar(10) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ddo_codes_district_unique" UNIQUE("district")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"upload_date" timestamp DEFAULT now(),
	"ai_verification_status" varchar(50),
	"ai_confidence_score" numeric(5, 2),
	"ai_notes" text,
	"is_verified" boolean DEFAULT false,
	"verification_status" varchar(50) DEFAULT 'pending',
	"verified_by" varchar,
	"verification_date" timestamp,
	"verification_notes" text
);
--> statement-breakpoint
CREATE TABLE "himkosh_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"dept_ref_no" varchar(45) NOT NULL,
	"app_ref_no" varchar(20) NOT NULL,
	"total_amount" integer NOT NULL,
	"tender_by" varchar(70) NOT NULL,
	"merchant_code" varchar(15),
	"dept_id" varchar(10),
	"service_code" varchar(5),
	"ddo" varchar(12),
	"head1" varchar(14),
	"amount1" integer,
	"head2" varchar(14),
	"amount2" integer,
	"head3" varchar(14),
	"amount3" integer,
	"head4" varchar(14),
	"amount4" integer,
	"head10" varchar(50),
	"amount10" integer,
	"period_from" varchar(10),
	"period_to" varchar(10),
	"encrypted_request" text,
	"request_checksum" varchar(32),
	"ech_txn_id" varchar(10),
	"bank_cin" varchar(20),
	"bank_name" varchar(10),
	"payment_date" varchar(14),
	"status" varchar(70),
	"status_cd" varchar(1),
	"response_checksum" varchar(32),
	"is_double_verified" boolean DEFAULT false,
	"double_verification_date" timestamp,
	"double_verification_data" jsonb,
	"challan_print_url" text,
	"portal_base_url" text,
	"transaction_status" varchar(50) DEFAULT 'initiated',
	"initiated_at" timestamp DEFAULT now(),
	"responded_at" timestamp,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "himkosh_transactions_app_ref_no_unique" UNIQUE("app_ref_no"),
	CONSTRAINT "himkosh_transactions_ech_txn_id_unique" UNIQUE("ech_txn_id")
);
--> statement-breakpoint
CREATE TABLE "homestay_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"application_number" varchar(50) NOT NULL,
	"application_kind" varchar(30) DEFAULT 'new_registration' NOT NULL,
	"parent_application_id" varchar,
	"parent_application_number" varchar(50),
	"parent_certificate_number" varchar(50),
	"inherited_certificate_valid_upto" timestamp,
	"service_context" jsonb,
	"service_notes" text,
	"service_requested_at" timestamp,
	"property_name" varchar(255) NOT NULL,
	"category" varchar(20) NOT NULL,
	"location_type" varchar(10) NOT NULL,
	"total_rooms" integer NOT NULL,
	"district" varchar(100) NOT NULL,
	"district_other" varchar(100),
	"tehsil" varchar(100) NOT NULL,
	"tehsil_other" varchar(100),
	"block" varchar(100),
	"block_other" varchar(100),
	"gram_panchayat" varchar(100),
	"gram_panchayat_other" varchar(100),
	"urban_body" varchar(200),
	"urban_body_other" varchar(200),
	"ward" varchar(50),
	"address" text NOT NULL,
	"pincode" varchar(10) NOT NULL,
	"telephone" varchar(20),
	"fax" varchar(20),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"owner_name" varchar(255) NOT NULL,
	"owner_gender" varchar(10) NOT NULL,
	"owner_mobile" varchar(15) NOT NULL,
	"owner_email" varchar(255),
	"guardian_name" varchar(255),
	"owner_aadhaar" varchar(12) NOT NULL,
	"property_ownership" varchar(10) DEFAULT 'owned' NOT NULL,
	"proposed_room_rate" numeric(10, 2),
	"project_type" varchar(20) NOT NULL,
	"property_area" numeric(10, 2) NOT NULL,
	"single_bed_rooms" integer DEFAULT 0,
	"single_bed_beds" integer DEFAULT 1,
	"single_bed_room_size" numeric(10, 2),
	"single_bed_room_rate" numeric(10, 2),
	"double_bed_rooms" integer DEFAULT 0,
	"double_bed_beds" integer DEFAULT 2,
	"double_bed_room_size" numeric(10, 2),
	"double_bed_room_rate" numeric(10, 2),
	"family_suites" integer DEFAULT 0,
	"family_suite_beds" integer DEFAULT 4,
	"family_suite_size" numeric(10, 2),
	"family_suite_rate" numeric(10, 2),
	"attached_washrooms" integer NOT NULL,
	"gstin" varchar(15),
	"selected_category" varchar(20),
	"average_room_rate" numeric(10, 2),
	"highest_room_rate" numeric(10, 2),
	"lowest_room_rate" numeric(10, 2),
	"certificate_validity_years" integer DEFAULT 1,
	"is_pangi_sub_division" boolean DEFAULT false,
	"distance_airport" numeric(10, 2),
	"distance_railway" numeric(10, 2),
	"distance_city_center" numeric(10, 2),
	"distance_shopping" numeric(10, 2),
	"distance_bus_stand" numeric(10, 2),
	"lobby_area" numeric(10, 2),
	"dining_area" numeric(10, 2),
	"parking_area" text,
	"eco_friendly_facilities" text,
	"differently_abled_facilities" text,
	"fire_equipment_details" text,
	"nearest_hospital" varchar(255),
	"amenities" jsonb,
	"rooms" jsonb,
	"base_fee" numeric(10, 2),
	"total_before_discounts" numeric(10, 2),
	"validity_discount" numeric(10, 2) DEFAULT '0',
	"female_owner_discount" numeric(10, 2) DEFAULT '0',
	"pangi_discount" numeric(10, 2) DEFAULT '0',
	"total_discount" numeric(10, 2) DEFAULT '0',
	"total_fee" numeric(10, 2),
	"per_room_fee" numeric(10, 2),
	"gst_amount" numeric(10, 2),
	"status" varchar(50) DEFAULT 'draft',
	"current_stage" varchar(50),
	"current_page" integer DEFAULT 1,
	"district_officer_id" varchar,
	"district_review_date" timestamp,
	"district_notes" text,
	"da_id" varchar,
	"da_review_date" timestamp,
	"da_forwarded_date" timestamp,
	"da_remarks" text,
	"state_officer_id" varchar,
	"state_review_date" timestamp,
	"state_notes" text,
	"dtdo_id" varchar,
	"dtdo_review_date" timestamp,
	"correction_submission_count" integer DEFAULT 0 NOT NULL,
	"dtdo_remarks" text,
	"rejection_reason" text,
	"clarification_requested" text,
	"site_inspection_scheduled_date" timestamp,
	"site_inspection_completed_date" timestamp,
	"site_inspection_officer_id" varchar,
	"site_inspection_notes" text,
	"site_inspection_outcome" varchar(50),
	"site_inspection_findings" jsonb,
	"ownership_proof_url" text,
	"aadhaar_card_url" text,
	"pan_card_url" text,
	"gst_certificate_url" text,
	"fire_safety_noc_url" text,
	"pollution_clearance_url" text,
	"building_plan_url" text,
	"property_photos_urls" jsonb,
	"documents" jsonb,
	"certificate_number" varchar(50),
	"certificate_issued_date" timestamp,
	"certificate_expiry_date" timestamp,
	"payment_status" varchar(20) DEFAULT 'pending',
	"payment_id" varchar(100),
	"payment_amount" numeric(10, 2),
	"payment_date" timestamp,
	"refund_date" timestamp,
	"refund_reason" text,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "homestay_applications_application_number_unique" UNIQUE("application_number"),
	CONSTRAINT "homestay_applications_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "inspection_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"scheduled_by" varchar NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"assigned_to" varchar NOT NULL,
	"assigned_date" timestamp NOT NULL,
	"inspection_date" timestamp NOT NULL,
	"inspection_address" text NOT NULL,
	"special_instructions" text,
	"status" varchar(50) DEFAULT 'scheduled',
	"dtdo_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inspection_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_order_id" varchar NOT NULL,
	"application_id" varchar NOT NULL,
	"submitted_by" varchar NOT NULL,
	"submitted_date" timestamp NOT NULL,
	"actual_inspection_date" timestamp NOT NULL,
	"room_count_verified" boolean NOT NULL,
	"actual_room_count" integer,
	"category_meets_standards" boolean NOT NULL,
	"recommended_category" varchar(20),
	"mandatory_checklist" jsonb,
	"mandatory_remarks" text,
	"desirable_checklist" jsonb,
	"desirable_remarks" text,
	"amenities_verified" jsonb,
	"amenities_issues" text,
	"fire_safety_compliant" boolean,
	"fire_safety_issues" text,
	"structural_safety" boolean,
	"structural_issues" text,
	"overall_satisfactory" boolean NOT NULL,
	"recommendation" varchar(50) NOT NULL,
	"detailed_findings" text NOT NULL,
	"inspection_photos" jsonb,
	"report_document_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lgd_blocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lgd_code" varchar(20),
	"block_name" varchar(100) NOT NULL,
	"district_id" varchar NOT NULL,
	"tehsil_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "lgd_blocks_lgd_code_unique" UNIQUE("lgd_code")
);
--> statement-breakpoint
CREATE TABLE "lgd_districts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lgd_code" varchar(20),
	"district_name" varchar(100) NOT NULL,
	"division_name" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "lgd_districts_lgd_code_unique" UNIQUE("lgd_code"),
	CONSTRAINT "lgd_districts_district_name_unique" UNIQUE("district_name")
);
--> statement-breakpoint
CREATE TABLE "lgd_gram_panchayats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lgd_code" varchar(20),
	"gram_panchayat_name" varchar(100) NOT NULL,
	"district_id" varchar NOT NULL,
	"block_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "lgd_gram_panchayats_lgd_code_unique" UNIQUE("lgd_code")
);
--> statement-breakpoint
CREATE TABLE "lgd_tehsils" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lgd_code" varchar(20),
	"tehsil_name" varchar(100) NOT NULL,
	"district_id" varchar NOT NULL,
	"tehsil_type" varchar(50) DEFAULT 'tehsil',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "lgd_tehsils_lgd_code_unique" UNIQUE("lgd_code")
);
--> statement-breakpoint
CREATE TABLE "lgd_urban_bodies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lgd_code" varchar(20),
	"urban_body_name" varchar(200) NOT NULL,
	"district_id" varchar NOT NULL,
	"body_type" varchar(50) NOT NULL,
	"number_of_wards" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "lgd_urban_bodies_lgd_code_unique" UNIQUE("lgd_code")
);
--> statement-breakpoint
CREATE TABLE "login_otp_challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"otp_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"application_id" varchar,
	"type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"channels" jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "objections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"inspection_report_id" varchar,
	"raised_by" varchar NOT NULL,
	"raised_date" timestamp NOT NULL,
	"objection_type" varchar(50) NOT NULL,
	"objection_title" varchar(255) NOT NULL,
	"objection_description" text NOT NULL,
	"severity" varchar(20) NOT NULL,
	"response_deadline" timestamp,
	"status" varchar(50) DEFAULT 'pending',
	"resolution_notes" text,
	"resolved_by" varchar,
	"resolved_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"channel" varchar(32) NOT NULL,
	"recipient" varchar(255),
	"otp_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"payment_type" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_gateway" varchar(50),
	"gateway_transaction_id" varchar(255),
	"payment_method" varchar(50),
	"payment_status" varchar(50) DEFAULT 'pending',
	"payment_link" text,
	"qr_code_url" text,
	"payment_link_expiry_date" timestamp,
	"initiated_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"receipt_number" varchar(100),
	"receipt_url" text,
	CONSTRAINT "payments_gateway_transaction_id_unique" UNIQUE("gateway_transaction_id"),
	CONSTRAINT "payments_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "production_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_applications" integer NOT NULL,
	"approved_applications" integer NOT NULL,
	"rejected_applications" integer NOT NULL,
	"pending_applications" integer NOT NULL,
	"scraped_at" timestamp DEFAULT now(),
	"source_url" text
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"is_verified_stay" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "storage_objects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" text NOT NULL,
	"storage_provider" varchar(20) DEFAULT 'local' NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"category" varchar(100) DEFAULT 'general',
	"mime_type" varchar(100) DEFAULT 'application/octet-stream',
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"checksum_sha256" varchar(128),
	"uploaded_by" varchar,
	"application_id" varchar,
	"document_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"last_accessed_at" timestamp,
	CONSTRAINT "storage_objects_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"setting_value" jsonb NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'general',
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"gender" varchar(10) NOT NULL,
	"aadhaar_number" varchar(12),
	"mobile" varchar(15) NOT NULL,
	"email" varchar(255),
	"district" varchar(100),
	"tehsil" varchar(100),
	"block" varchar(100),
	"gram_panchayat" varchar(100),
	"urban_body" varchar(200),
	"ward" varchar(50),
	"address" text,
	"pincode" varchar(10),
	"telephone" varchar(20),
	"fax" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mobile" varchar(15) NOT NULL,
	"full_name" text NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"username" varchar(50),
	"email" varchar(255),
	"alternate_phone" varchar(15),
	"designation" varchar(100),
	"department" varchar(100),
	"employee_id" varchar(50),
	"office_address" text,
	"office_phone" varchar(15),
	"role" varchar(50) DEFAULT 'property_owner' NOT NULL,
	"aadhaar_number" varchar(12),
	"district" varchar(100),
	"password" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_mobile_unique" UNIQUE("mobile"),
	CONSTRAINT "users_aadhaar_number_unique" UNIQUE("aadhaar_number")
);
--> statement-breakpoint
ALTER TABLE "application_actions" ADD CONSTRAINT "application_actions_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_actions" ADD CONSTRAINT "application_actions_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_renewal_application_id_homestay_applications_id_fk" FOREIGN KEY ("renewal_application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_objection_id_objections_id_fk" FOREIGN KEY ("objection_id") REFERENCES "public"."objections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "himkosh_transactions" ADD CONSTRAINT "himkosh_transactions_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homestay_applications" ADD CONSTRAINT "homestay_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homestay_applications" ADD CONSTRAINT "homestay_applications_district_officer_id_users_id_fk" FOREIGN KEY ("district_officer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homestay_applications" ADD CONSTRAINT "homestay_applications_da_id_users_id_fk" FOREIGN KEY ("da_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homestay_applications" ADD CONSTRAINT "homestay_applications_state_officer_id_users_id_fk" FOREIGN KEY ("state_officer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homestay_applications" ADD CONSTRAINT "homestay_applications_dtdo_id_users_id_fk" FOREIGN KEY ("dtdo_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homestay_applications" ADD CONSTRAINT "homestay_applications_site_inspection_officer_id_users_id_fk" FOREIGN KEY ("site_inspection_officer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_orders" ADD CONSTRAINT "inspection_orders_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_orders" ADD CONSTRAINT "inspection_orders_scheduled_by_users_id_fk" FOREIGN KEY ("scheduled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_orders" ADD CONSTRAINT "inspection_orders_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_reports" ADD CONSTRAINT "inspection_reports_inspection_order_id_inspection_orders_id_fk" FOREIGN KEY ("inspection_order_id") REFERENCES "public"."inspection_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_reports" ADD CONSTRAINT "inspection_reports_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_reports" ADD CONSTRAINT "inspection_reports_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgd_blocks" ADD CONSTRAINT "lgd_blocks_district_id_lgd_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."lgd_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgd_blocks" ADD CONSTRAINT "lgd_blocks_tehsil_id_lgd_tehsils_id_fk" FOREIGN KEY ("tehsil_id") REFERENCES "public"."lgd_tehsils"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgd_gram_panchayats" ADD CONSTRAINT "lgd_gram_panchayats_district_id_lgd_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."lgd_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgd_gram_panchayats" ADD CONSTRAINT "lgd_gram_panchayats_block_id_lgd_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."lgd_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgd_tehsils" ADD CONSTRAINT "lgd_tehsils_district_id_lgd_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."lgd_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgd_urban_bodies" ADD CONSTRAINT "lgd_urban_bodies_district_id_lgd_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."lgd_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_otp_challenges" ADD CONSTRAINT "login_otp_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_inspection_report_id_inspection_reports_id_fk" FOREIGN KEY ("inspection_report_id") REFERENCES "public"."inspection_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_raised_by_users_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_challenges" ADD CONSTRAINT "password_reset_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_application_id_homestay_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."homestay_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;