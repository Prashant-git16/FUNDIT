:: setup-db.bat — One-shot local database setup for Fundit
:: Run this from the backend/ directory after creating the MySQL user.
::
:: Prerequisites:
::   1. MySQL 8.0 running locally
::   2. A MySQL user 'fundit_user' with password (see CREATE USER below)
::   3. Environment: MYSQL_ADMIN_PASS = your MySQL root password
::
:: Usage:
::   set MYSQL_ADMIN_PASS=your_root_password
::   setup-db.bat

@echo off
echo === Fundit Database Setup ===

echo Creating database and user...
mysql -u root -p%MYSQL_ADMIN_PASS% -e ^
  "CREATE DATABASE IF NOT EXISTS fundit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; ^
   CREATE USER IF NOT EXISTS 'fundit_user'@'localhost' IDENTIFIED BY 'Fundit@123'; ^
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON fundit_db.* TO 'fundit_user'@'localhost'; ^
   FLUSH PRIVILEGES;"

echo Running schema...
mysql -u fundit_user -pFundit@123 fundit_db < schema.sql

echo Loading seed data...
mysql -u fundit_user -pFundit@123 fundit_db < seed.sql

echo Done! Update backend/.env with:
echo   DB_USER=fundit_user
echo   DB_PASSWORD=Fundit@123
echo   DB_NAME=fundit_db
