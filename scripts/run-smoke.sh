#!/usr/bin/env bash
# Manual smoke-test wrapper (runs npm run smoke and captures logs)

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_ROOT}"

LOG_ROOT="${PROJECT_ROOT}/docs/smoke-reports"
mkdir -p "${LOG_ROOT}"
RUN_ID="${SMOKE_RUN_ID:-$(date -u +"%Y-%m-%dT%H-%M-%SZ")}"
RUN_LOG="${LOG_ROOT}/${RUN_ID}.log"

export SMOKE_OWNER_MOBILE="${SMOKE_OWNER_MOBILE:-7777777771}"
export SMOKE_OWNER_PASSWORD="${SMOKE_OWNER_PASSWORD:-test123}"
export SMOKE_DA_MOBILE="${SMOKE_DA_MOBILE:-7777777772}"
export SMOKE_DA_PASSWORD="${SMOKE_DA_PASSWORD:-test123}"
export SMOKE_DTDO_MOBILE="${SMOKE_DTDO_MOBILE:-8888888881}"
export SMOKE_DTDO_PASSWORD="${SMOKE_DTDO_PASSWORD:-test123}"

{
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting smoke test run ${RUN_ID}..."
  npm run smoke
  STATUS=$?
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Smoke test finished with exit code ${STATUS}"
  exit ${STATUS}
} >>"${RUN_LOG}" 2>&1

ln -sf "${RUN_LOG}" "${LOG_ROOT}/latest.log"
