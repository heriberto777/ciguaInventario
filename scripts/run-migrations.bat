@echo off
cd /d D:\proyectos\app\ciguaInv
set DATABASE_URL=postgresql://user:password@cigua_postgres:5432/cigua_inv

"C:\Program Files\Docker\Docker\resources\bin\docker.exe" run --rm -v "%CD%":/workspace -w /workspace --network ciguainv_default -e DATABASE_URL=%DATABASE_URL% node:20-alpine sh migrate.sh

pause
