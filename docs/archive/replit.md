# HP Tourism Digital Ecosystem

## Overview

The HP Tourism Digital Ecosystem is a digital transformation platform designed to modernize tourism registration and management in Himachal Pradesh. It serves as both a public tourism discovery portal and an administrative system for operators, specifically implementing the "Himachal Pradesh Homestay Rules 2025" with a three-tier categorization (Diamond, Gold, Silver). The platform aims to automate processes and streamline user experiences to significantly reduce application processing times. Key capabilities include a Public Tourism Discovery Platform, a Smart Compliance Hub for property owners, an Analytics Dashboard for government officers, an Admin User Management System, and a Workflow Monitoring Dashboard for real-time application tracking and intelligent alerting. The project's ambition is to provide a robust, scalable, and user-friendly solution, enhancing both visitor experience and administrative efficiency within the state's tourism sector.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The platform employs a clean, professional design consistent with HP Government branding, featuring a teal-green accent. It includes an accessible hero carousel compliant with WCAG standards and offers an 8-theme system with accessible color contrasts. The design prioritizes clear workflows, adherence to government portal standards, and a mobile-first approach with intuitive user interfaces across all user roles.

### Technical Implementations

The frontend is built with React 18+, TypeScript, and Vite, utilizing Shadcn/ui (Radix UI) for components, Tailwind CSS for mobile-first styling, TanStack Query for server state management, React Hook Form with Zod for robust form handling, and Wouter for efficient routing. The backend uses Node.js and Express.js in TypeScript, following a RESTful API design. Session management is handled by Express sessions with PostgreSQL storage, and role-based navigation and route guards enforce access control. Security measures include forced role parameters during public registration to prevent escalation, bcrypt password hashing, and admin-only creation for government official accounts.

### Feature Specifications

- **Public Tourism Discovery Platform**: Allows browsing and filtering of approved homestays.
- **Smart Compliance Hub**: Facilitates homestay registration, application submission, and status tracking for property owners, including draft save & resume functionality.
- **ANNEXURE-I Compliant Registration Form**: A multi-step form implementing HP Homestay Rules 2025, covering property details, owner information, room details & category, distances & public areas, ANNEXURE-II documents, and amenities & summary, with district-based distance auto-population, location-based fee calculation, and conditional GSTIN validation.
- **Analytics Dashboard**: Provides government officers with insights into application trends, status distributions, and processing times.
- **Workflow Monitoring Dashboard**: Offers a real-time, visual pipeline of applications through six stages, with SLA tracking.
- **Multiple Payment Gateways**: Integrated payment system supporting HimKosh, Razorpay, CCAvenue, PayU, and UPI QR Code.
- **Production-Level Role-Based Access Control (RBAC)**: Comprehensive RBAC with distinct roles (Property Owner, Dealing Assistant, District Tourism Officer, District Officer, State Officer, Admin, `super_admin`).
- **Dealing Assistant (DA) Workflow**: Includes a DA Dashboard with district-specific application queues, document scrutiny interface, verification checklists, and secure API routes for managing application review, forwarding, and inspection order management with ANNEXURE-III compliant report submission.
- **ANNEXURE-III Inspection Checklist System**: A comprehensive field inspection reporting system implementing official HP Homestay Rules 2025.
- **District Tourism Development Officer (DTDO) Workflow**: Complete workflow including DTDO Dashboard, application review interface with accept/reject/revert options, inspection scheduling system, and post-inspection report review workflow.
- **Admin Database Reset with Granular Preservation**: Flexible database reset for testing, allowing preservation of specific data types.
- **LGD Master Data Integration**: Comprehensive Local Government Directory tables for Himachal Pradesh's 5-tier administrative hierarchy.
- **LGD Master Data Import Tool**: Admin interface for importing official Local Government Directory data via CSV.
- **Admin User Creation System**: Dialog-based interface for administrators to create new users with various roles.
- **Tabbed User Management Interface**: Enhanced admin user management with tabbed categorization for "Staff Users" and "Property Owners", including comprehensive edit functionality.

### System Design Choices

- **Monorepo Structure**: Organizes `client/`, `server/`, and `shared/` for type consistency and code management.
- **Serverless-Ready Database**: Utilizes Neon PostgreSQL and Drizzle ORM for type-safe and scalable data storage.
- **Component-First UI**: Leverages Shadcn/ui for rapid and consistent UI development.
- **Shared Schema Pattern**: Ensures type safety and prevents schema drift across frontend and backend.
- **Session-Based Authentication**: Implements PostgreSQL-backed sessions for authentication.
- **Query Cache Management**: TanStack Query cache is automatically invalidated on logout.
- **Role-Specific APIs**: Backend endpoints filter data based on user role and district assignment.
- **Frontend Route Guards**: `ProtectedRoute` component validates user roles and redirects unauthorized access.
- **Official 2025 Policy Compliance**: Fully implements the **Himachal Pradesh Home Stay Rules, 2025**, covering room specifications, tiered fee structure (GST Included), discount system, GSTIN requirements, certificate validity, and a 60-day processing timeline.

## Recent Updates (November 2025)

### HimKosh Payment Gateway Critical Fixes
Fixed 3 undocumented DLL behavior issues causing CHECK_SUM_MISMATCH errors:
1. **Checksum Casing Fix**: Changed MD5 checksum from UPPERCASE to lowercase - actual DLL returns lowercase hex (documentation incorrectly implied uppercase)
2. **Integer Amounts Only**: All amounts now strictly integers using Math.round() on totalAmount, amount1-10 - prevents ASP.NET FormatException triggered by decimals like "100.00"
3. **AES IV Configuration**: IV now equals key (first 16 bytes of echallan.key) instead of separate IV - matches actual DLL encryption/decryption behavior (documentation and dummy code were misleading)

### Payment Module UI & Backend Fixes
- Backend accepts both `payment_pending` AND `verified_for_payment` statuses for HimKosh initiation
- Payment pages display 2025 fee structure with discount breakdown (Base Fee, Validity Discount, Female Owner Discount, Pangi Discount)
- Eliminated double scrollbars by removing `min-h-screen` from payment pages
- Added null safety checks for `totalFee` field
- Created `system_settings` table for payment configuration

## External Dependencies

- **UI Component Libraries**: `@radix-ui/*`, `cmdk`, `embla-carousel-react`, `lucide-react`, `recharts`
- **Form Management**: `react-hook-form`, `zod`, `@hookform/resolvers`
- **Styling and Theming**: `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`
- **Date Handling**: `date-fns`
- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- **Payment Processing**: `qrcode`, HimKosh CTP, Razorpay, CCAvenue, PayU