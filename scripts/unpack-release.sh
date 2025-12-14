#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 2 ]]; then
  echo "Usage: sudo $0 <archive-path> <target-dir>" >&2
  exit 1
fi
ARCHIVE=$1
TARGET=$2
BASENAME=$(basename "$ARCHIVE" .tar.gz)
TARGET_DIR="$TARGET/$BASENAME"
mkdir -p "$TARGET"
tar -xzf "$ARCHIVE" -C "$TARGET"
cat <<MSG
✅ Extracted to $TARGET_DIR
Next steps:
  cd $TARGET_DIR
  sudo bash Installation/setup.sh
MSG
