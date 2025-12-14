#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
DEPS_DIR="$REPO_ROOT/deps"
mkdir -p "$DEPS_DIR"

# Full offline package set (Ubuntu 24.04, amd64)
PKGS=(
  nginx=1.24.0-2ubuntu7.5
  postgresql-16=16.10-0ubuntu0.24.04.1
  postgresql-client-16=16.10-0ubuntu0.24.04.1
  postgresql-common=257build1.1
  postgresql-client-common=257build1.1
  postgresql-contrib=16+257build1.1
  libpq5=16.10-0ubuntu0.24.04.1
  fail2ban=1.0.2-3ubuntu0.1
  python3-pyasyncore=1.0.2-2
  python3-pyinotify=0.9.6-2ubuntu1
  whois=5.5.22
  ssl-cert=1.1.2ubuntu1
  libperl5.38t64=5.38.2-3.2ubuntu0.2
  perl=5.38.2-3.2ubuntu0.2
  perl-base=5.38.2-3.2ubuntu0.2
  perl-modules-5.38=5.38.2-3.2ubuntu0.2
  libjson-perl=4.10000-1
  libjson-xs-perl=4.040-0ubuntu0.24.04.1
  libcommon-sense-perl=3.75-3build3
  libtypes-serialiser-perl=1.01-1
  libllvm17t64=1:17.0.6-9ubuntu1
)

echo "📦 Fetching APT packages into $DEPS_DIR"
sudo apt-get update
for pkg in "${PKGS[@]}"; do
  echo "⬇️  Downloading ${pkg}"
  (cd "$DEPS_DIR" && apt-get download "$pkg")
done

NODE_VERSION="v20.17.0"
NODE_TARBALL="node-${NODE_VERSION}-linux-x64.tar.xz"
if [[ ! -f "$DEPS_DIR/$NODE_TARBALL" ]]; then
  echo "⬇️  Downloading Node.js ${NODE_VERSION}"
  curl -L "https://nodejs.org/dist/${NODE_VERSION}/${NODE_TARBALL}" -o "$DEPS_DIR/$NODE_TARBALL"
fi

if ! ls "$DEPS_DIR"/pm2-*.tgz >/dev/null 2>&1; then
  echo "⬇️  Packing PM2 for offline install"
  npm pack pm2 --pack-destination "$DEPS_DIR"
fi

echo "✅ Dependency artifacts downloaded to $DEPS_DIR"
