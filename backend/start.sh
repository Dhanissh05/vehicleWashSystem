#!/bin/sh
set -e

echo "Running database cleanup..."
npx prisma db execute --schema=./prisma/schema.prod.prisma --file=./cleanup-duplicates.sql || echo "Cleanup script failed or no duplicates found, continuing..."

echo "Pushing database schema..."
npx prisma db push --schema=./prisma/schema.prod.prisma --accept-data-loss --skip-generate

echo "Running multi-tenant migration..."
node quick-migrate.js || echo "Migration completed or skipped"

echo "Running database seed..."
node prisma/seed.js

echo "Starting server..."
node dist/index.js
