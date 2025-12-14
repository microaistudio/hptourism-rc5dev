#!/bin/bash
set -e

VERSION="0.6.0"
RELEASE_DIR="release/v${VERSION}"
mkdir -p "$RELEASE_DIR"

echo "📦 Packaging HP Tourism Portal v${VERSION}..."

# 1. Source Code Pack (For Security Audit)
echo "🔒 Creating Source Code Audit Pack..."
SOURCE_ZIP="${RELEASE_DIR}/hptourism-v${VERSION}-source-audit.zip"
zip -r "$SOURCE_ZIP" . \
  -x "node_modules/*" \
  -x "dist/*" \
  -x "release/*" \
  -x ".git/*" \
  -x "logs/*" \
  -x "backups/*" \
  -x "tests/*" \
  -x "test-results/*" \
  -x "*.log" \
  -x ".env" \
  -x "local-object-storage/*"

echo "✅ Source pack created: $SOURCE_ZIP"

# 2. Installer Pack (For Data Center Deployment)
echo "🚀 Building for Installer Pack..."
npm run build

INSTALLER_DIR="${RELEASE_DIR}/hptourism-installer"
rm -rf "$INSTALLER_DIR"
mkdir -p "$INSTALLER_DIR"

# Copy Runtime Files
cp package.json package-lock.json ecosystem.config.cjs drizzle.config.ts "$INSTALLER_DIR/"
cp -r dist "$INSTALLER_DIR/"
cp -r migrations "$INSTALLER_DIR/"
cp -r shared "$INSTALLER_DIR/"
# Note: shared/ is moved to dist/ during build? 
# Vite builds shared -> dist/assets (implicit)
# Server imports shared. esbuild bundles internal shared code into dist/index.js.
# BUT, Drizzle config/migrations might need shared schema if references exist.
# Safest to include 'shared' source just in case, but usually bundled.
# Actually, wait. Server bundle `esbuild ... --bundle` INCLUDES shared code. Use `packages=external` for node_modules.
# So we DON'T need shared/ source for the app to run.
# However, `drizzle-kit` might need `shared/schema.ts`.
cp -r shared "$INSTALLER_DIR/" 

# Create Install Script
cat > "$INSTALLER_DIR/install.sh" << 'EOF'
#!/bin/bash
echo "🔧 Installing dependencies..."
npm ci --omit=dev

echo "⚠️  NOTE: Database migration requires 'drizzle-kit' which is a dev dependency."
echo "If you need to run migrations, please run: npm install drizzle-kit -D"
echo "Then: npm run db:push"

echo "✅ Installation complete."
echo "To start the server: npm run start"
echo "To using PM2: pm2 start ecosystem.config.cjs"
EOF
chmod +x "$INSTALLER_DIR/install.sh"

# Create README for Installer
cat > "$INSTALLER_DIR/README.md" << EOF
# HP Tourism Portal v${VERSION} - Installer

## Prerequisites
- Node.js v20+
- PostgreSQL 16+
- Redis (Optional, for session caching)

## Installation
1. Run \`./install.sh\` to install dependencies.
2. Configure \`.env\` file (use \`.env.example\` as reference).
3. Run migrations (requires database connection).

## Starting the App
- **Direct:** \`npm start\`
- **PM2:** \`pm2 start ecosystem.config.cjs\`

## Environment Variables
Ensure the following are set in \`.env\`:
- \`DATABASE_URL\`
- \`SESSION_SECRET\` (Min 32 chars)
- \`PORT\` (Default: 5000)
EOF

cp .env.example "$INSTALLER_DIR/"

# Zip Installer
echo "📦 Zipping Installer Pack..."
cd "$RELEASE_DIR"
zip -r "hptourism-v${VERSION}-installer.zip" "hptourism-installer"
rm -rf "hptourism-installer"
cd -

echo "✅ Installer pack created: ${RELEASE_DIR}/hptourism-v${VERSION}-installer.zip"
echo "🎉 Release Preparation Complete!"
