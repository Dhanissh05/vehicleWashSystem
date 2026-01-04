#!/usr/bin/env bash

set -euo pipefail

# Decode and create google-services.json from EAS Secret
if [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
  echo "✓ Creating google-services.json from EAS Secret..."
  echo "$GOOGLE_SERVICES_JSON" | base64 -d > google-services.json
  echo "✓ google-services.json created successfully"
else
  echo "⚠ WARNING: GOOGLE_SERVICES_JSON environment variable not set"
  echo "FCM push notifications will not work without this file"
  exit 1
fi
