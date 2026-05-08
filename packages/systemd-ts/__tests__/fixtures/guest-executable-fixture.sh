#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SYSTEMD_TS_MARKER_FILE:-}" ]]; then
  echo "SYSTEMD_TS_MARKER_FILE must be set for guest executable fixture tests" >&2
  exit 1
fi

printf 'ran' > "${SYSTEMD_TS_MARKER_FILE}"
