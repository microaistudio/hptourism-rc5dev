# 🏔️ HP Tourism Digital Ecosystem

[![Run on Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run)

**Modernizing Himachal Pradesh's tourism registration and management system**

A comprehensive digital transformation platform that reduces homestay application processing from **105 days to 7-15 days** through automation and streamlined workflows, implementing the **Himachal Pradesh Homestay Rules 2025**.

---

## 📖 Overview

The HP Tourism Digital Ecosystem serves three core functions:

### 1. 🏠 Smart Compliance Hub
- **Homestay Registration** - Property owners register and submit applications
- **Three-Tier Categorization** - Diamond, Gold, Silver categories per 2025 Rules
- **Two-Stage Review Workflow** - District Officer → State Officer approval
- **Real-time Tracking** - Monitor application status throughout the process
- **Automated Fee Calculation** - Based on category and room count

### 2. 🌍 Tourism Discovery Platform
- **Public Property Browsing** - No login required
- **Advanced Search & Filters** - By district, category, amenities
- **Property Details** - Photos, certification info, owner contact
- **Government Certification** - Official approval status display

### 3. 📊 Analytics Dashboard
- **Key Metrics** - Total applications, approval rates, processing times
- **Visual Analytics** - Charts for status, category, and district distribution
- **Officer Insights** - District and State officers track trends
- **Performance Monitoring** - Track progress toward 7-15 day goal

---

## ✨ Key Features

- ⚡ **Lightning Fast** - Built with React + Vite for optimal performance
- 🔒 **Secure** - Bcrypt password hashing, session-based authentication
- 💾 **Persistent** - PostgreSQL database (Neon or Cloud SQL)
- 📱 **Responsive** - Mobile-first design with Tailwind CSS
- ♿ **Accessible** - Built with Shadcn/ui on Radix primitives
- 🎨 **Modern UI** - Clean government portal aesthetics
- 🔄 **Real-time Updates** - TanStack Query for optimistic updates
- 🧪 **Type-Safe** - Full TypeScript coverage with Drizzle ORM

---

## 🚀 Quick Deploy to GCP

### One-Click Deployment

1. Click the **"Run on Google Cloud"** button above
2. Sign in to your Google Cloud account
3. Set `DATABASE_URL` environment variable
4. Deploy and get your live URL in ~3 minutes

**See [DEPLOY_GCP.md](./DEPLOY_GCP.md) for detailed deployment guide.**

---

## 💻 Local Development

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (local or Neon)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd hp-tourism-ecosystem

# Install dependencies
npm install

# Set up environment variables
# Create .env file with:
DATABASE_URL=postgresql://user:password@localhost:5432/hp_tourism
SESSION_SECRET=your-secret-key-here

# Push database schema
npm run db:push

# Start development server
npm run dev
```

**Application runs on http://localhost:5000**

### Development Tools

```bash
# Database operations
npm run db:push          # Sync schema to database
npm run db:studio        # Open Drizzle Studio GUI

# Development
npm run dev              # Start dev server with HMR
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run full Vitest suite (API + React)
npm run test:watch       # Watch mode for active development
```

### 🧾 Logging & Diagnostics

- `LOG_LEVEL` (default `info`) controls the global verbosity for both API + worker logs. Use `debug` or `trace` when you need deeper diagnostics.
- `LOG_PRETTY=true` pipes logs through `pino-pretty` so local runs are easier to read; keep it `false` in PM2/systemd for JSON output.
- `LOG_TRACE_PAYMENTS=true` enables deep HimKosh payment tracing (DDO routing decisions, encrypted payload preview, callback metadata). Leave it `false` outside of staging to avoid leaking sensitive payloads and to keep log volume low.
- `LOG_TRACE_SMS=true` captures SMS gateway payloads/responses (passwords are masked) to troubleshoot NIC/Twilio issues. Disable once configs are stable.
- `LOG_TRACE_HTTP=true` emits per-request traces (method, path, session user). Useful during API debugging; keep it `false` in production to minimize noise.
- `LOG_FILE_ENABLED=true` writes everything to `logs/app.log` with automatic rotation (gzip) once the file reaches `LOG_FILE_MAX_SIZE_MB` (default 10 MB). Tweak `LOG_FILE_PATH`, `LOG_FILE_ROTATE_INTERVAL` (default daily), and `LOG_FILE_MAX_FILES` (default 7 copies) if you need longer retention.
- All new logs flow through the shared `server/logger.ts`, so request IDs and module names stay consistent across services and PM2 processes. Console + file sinks are managed centrally—set the env variables and restart PM2 to toggle behaviour.

### 🔐 Security Guardrails

- **Rate limiting:** enabled by default via `SECURITY_ENABLE_RATE_LIMIT=true`. Use `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX_REQUESTS` for global caps, `RATE_LIMIT_AUTH_*` for login/OTP endpoints, and `RATE_LIMIT_UPLOAD_*` for file uploads. Requests above these thresholds receive HTTP 429 with a descriptive message; overrides write to the structured log with the offending IP/user.
- **Captcha:** toggleable through Super Admin (`/api/admin/settings/auth/captcha`) or by setting `SECURITY_ENABLE_CSRF`/`CAPTCHA_SETTING_KEY` flags in the DB. Captcha answers expire after five minutes; failed attempts reset the challenge.

### Dev Console

In development mode, click the **"Dev Console"** button (bottom-right) to:
- View database statistics
- Seed sample data
- Clear all data for testing

**Demo Credentials (after seeding):**
- District Officer: `9876543211` / `test123`
- State Officer: `9876543212` / `test123`
- Property Owner: `9876543210` / `test123`

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: Shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **State Management**: TanStack Query
- **Routing**: Wouter

### Backend
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL via Neon/Cloud SQL
- **ORM**: Drizzle ORM
- **Authentication**: Session-based with bcrypt
- **Session Store**: Connect-pg-simple

### Infrastructure
- **Deployment**: Google Cloud Run
- **CI/CD**: Cloud Build
- **Database**: Neon PostgreSQL (or Cloud SQL)
- **Container**: Docker

---

## 📁 Project Structure

```
hp-tourism-ecosystem/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities and config
│   │   └── hooks/         # Custom React hooks
│   └── dist/              # Built frontend (production)
├── server/                # Backend Express application
│   ├── db.ts              # Database connection
│   ├── db-storage.ts      # PostgreSQL storage implementation
│   ├── storage.ts         # Storage interface
│   ├── routes.ts          # API routes
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
│   └── schema.ts          # Drizzle database schema
├── Dockerfile             # Container configuration
├── app.json               # Cloud Run Button config
├── cloudbuild.yaml        # CI/CD pipeline
└── DEPLOY_GCP.md          # Deployment guide
```

---

## 🎯 User Roles

### Property Owner
- Register homestay properties
- Submit applications with documents
- Track application status
- View approval/rejection reasons

### District Officer
- Review applications for their district
- Approve or reject with comments
- Forward to state level for final review
- Access analytics dashboard

### State Officer
- Final approval authority
- Review applications from all districts
- Access comprehensive analytics
- Monitor processing times

### Public (No Login)
- Browse approved properties
- Filter by district, category, amenities
- View property details and certifications
- Contact property owners

---

## 🔐 Security

- ✅ Bcrypt password hashing (10 rounds)
- ✅ Session-based authentication
- ✅ PostgreSQL-backed sessions
- ✅ Role-based access control
- ✅ SQL injection protection (Drizzle ORM)
- ✅ Environment-based secrets management
- ✅ HTTPS-only in production

---

## 📈 Performance

- **First Load**: < 2 seconds
- **Time to Interactive**: < 3 seconds
- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices)
- **Database Queries**: Optimized with COUNT operations
- **Auto-scaling**: Cloud Run scales 0 → 10 instances

---

## 🧪 Testing

End-to-end tests verify:
- User authentication flow
- Application submission and review
- Analytics dashboard accuracy
- Public property discovery
- Data persistence

**Run tests:**
```bash
npm run test
```

---

## 📊 Analytics & Monitoring

Government officers can access:

- **Overview Stats**: Total applications, approvals, processing time, owners
- **Status Distribution**: Pie chart of application statuses
- **Category Breakdown**: Diamond/Gold/Silver distribution
- **District Analytics**: Top 10 districts by volume
- **Recent Applications**: Last 10 submissions with status

---

## 🌐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `SESSION_SECRET` | Session encryption key | ✅ Yes |
| `NODE_ENV` | Environment (development/production) | Auto-set |
| `PORT` | Server port (auto-set by Cloud Run) | Auto-set |

---

## 🚦 Deployment

### GCP Cloud Run (Recommended)

**One-Click:** Click "Run on Google Cloud" button above

**CLI:**
```bash
gcloud run deploy hp-tourism-ecosystem \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest"
```

**See [DEPLOY_GCP.md](./DEPLOY_GCP.md) for complete guide**

### Other Platforms

The application works on any platform supporting Docker:
- AWS ECS/Fargate
- Azure Container Instances
- Heroku
- Render
- Fly.io

---

## 🗺️ Roadmap

- [x] Smart Compliance Hub
- [x] Tourism Discovery Platform  
- [x] Analytics Dashboard
- [x] PostgreSQL migration
- [x] GCP deployment package
- [ ] Document upload functionality
- [ ] Payment gateway integration
- [ ] Email/SMS notifications
- [ ] Tourist reviews and ratings
- [ ] Custom domain support
- [ ] Multi-language support (Hindi, English)

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

---

## 📄 License

This project is developed for the Himachal Pradesh Government Tourism Department.

---

## 📞 Support

For technical support or questions:
- **Email**: support@example.com
- **GitHub Issues**: [Create an issue](https://github.com/YOUR_REPO/issues)

---

## 🙏 Acknowledgments

Built to support the Chief Minister's vision for digital governance transformation in Himachal Pradesh.

**Powered by:**
- React & Vite
- Drizzle ORM
- Shadcn/ui
- Google Cloud Platform
- Neon PostgreSQL

---

**Made with ❤️ for Himachal Pradesh Tourism**
