@echo off
cd /d D:\proyectos\app\ciguaInv\apps\backend
set DATABASE_URL=postgresql://user:password@127.0.0.1:5432/cigua_inv
pnpm prisma db push
pause
