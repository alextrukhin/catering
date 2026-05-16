#!/bin/bash

cd /app/packages/prisma && npm i dotenv && npx prisma migrate deploy && rm -rf node_modules package-lock.json
cd /app && node --import ./packages/website/.output/server/sentry.server.config.mjs packages/website/.output/server/index.mjs