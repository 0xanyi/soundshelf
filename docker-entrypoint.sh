#!/bin/sh
set -e

echo "Running database migrations..."
npm run db:deploy

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ] && [ -n "$ADMIN_NAME" ]; then
  echo "Seeding admin user..."
  npm run db:seed
else
  echo "Skipping admin seed (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME not all set)."
fi

echo "Starting Next.js..."
exec npm run start
