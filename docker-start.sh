#!/bin/sh
# Sync the database schema (non-fatal if the DB is briefly unavailable),
# then start the Next.js standalone server.
node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss || \
  echo "WARN: prisma db push failed — the app will start anyway"
exec node server.js
