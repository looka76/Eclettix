#!/bin/bash
# Installs rembg (background removal CLI) in Claude Code cloud sessions.
set -euo pipefail

# Only run in remote (cloud) sessions, not on local machines.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if ! command -v rembg >/dev/null 2>&1; then
  pip install -q "rembg[cpu,cli]" >/dev/null 2>&1
fi
