#!/bin/sh
cd /workspace/apps/backend
npm install -g pnpm
pnpm install
pnpm prisma migrate dev --name init
