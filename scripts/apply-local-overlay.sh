#!/usr/bin/env bash
set -euo pipefail

PATCH_FILE="${1:-upgrade-overlays/0001-local-custom.patch}"

if [[ ! -f "$PATCH_FILE" ]]; then
  echo "Patch not found: $PATCH_FILE" >&2
  exit 1
fi

echo "Applying local overlay: $PATCH_FILE"
# --3way improves resilience when upstream changes nearby context.
git apply --3way "$PATCH_FILE"

echo "Overlay applied. Review with: git status --short"
