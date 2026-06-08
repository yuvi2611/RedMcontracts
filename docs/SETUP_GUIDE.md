# ContractIQ Setup Guide
## Development Environment Configuration

**Last Updated**: June 5, 2026  
**Status**: Production Ready  

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Database Setup](#database-setup)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **RAM**: 8GB minimum (16GB recommended)
- **Disk Space**: 20GB free
- **Network**: Stable internet connection

### Required Software

#### Backend (.NET 8)
- **.NET SDK 8.0+** - [Download](https://dotnet.microsoft.com/download/dotnet/8.0)
  ```bash
  # Verify installation
  dotnet --version  # Should be 8.0.x
  ```

- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
  ```bash
  # Verify installation
  psql --version  # Should be 14.x or higher
  ```

#### Frontend (Angular 18)
- **Node.js 18+** - [Download](https://nodejs.org/)
  ```bash
  # Verify installation
  node --version   # Should be 18.x or higher
  npm --version    # Should be 9.x or higher
  ```

#### Development Tools
- **Git** - [Download](https://git-scm.com/)
- **Visual Studio Code** - [Download](https://code.visualstudio.com/)
  - Recommended Extensions:
    - C# Dev Kit (for backend)
    - Angular Language Service (for frontend)
    - Prettier (code formatter)
    - ESLint (linter)
    - PostgreSQL (database)

- **Docker & Docker Compose** (Optional but recommended)
  ```bash
  # Download from https://www.docker.com/products/docker-desktop
  docker --version
  docker-compose --version
  ```

---

## Quick Start

### Option 1: Docker Compose (Recommended for Development)

```bash
# 1. Clone repository
git clone <repository-url>
cd RedMPS_Contract

# 2. Copy environment configuration
cp config/.env.example .env

# 3. Start all services (Database, Backend, Frontend)
docker-compose -f config/docker-compose.yml up -d

# 4. Wait for services to start (30-60 seconds)
# Frontend: http://localhost:4200
# Backend: http://localhost:5000
# API Docs: http://localhost:5000/swagger
# pgAdmin: http://localhost:5050 (admin/admin)
```

### Option 2: Local Development (Manual Setup)

Follow the detailed sections below.

---

## Backend Setup

### Step 1: Install .NET SDK

```bash
# Windows (using Chocolatey)
choco install dotnet-sdk

# macOS (using Homebrew)
brew install dotnet-sdk

# Linux (Ubuntu)
sudo apt-get install dotnet-sdk-8.0
```

### Step 2: Verify .NET Installation

```bash
dotnet --version
dotnet --info
```

### Step 3: Clone Repository

```bash
git clone <repository-url>
cd RedMPS_Contract/src/backend
```

### Step 4: Restore NuGet Packages

```bash
dotnet restore
```

### Step 5: Configure Database Connection

Create `appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=contractiq_dev;Username=contractiq_user;Password=your_password;Pooling=true;Minimum Pool Size=5;Maximum Pool Size=20;"
  },
  "JwtSettings": {
    "Secret": "your_super_secret_key_min_32_characters_long",
    "Issuer": "ContractIQ",
    "Audience": "ContractIQ.API",
    "ExpirationMinutes": 15
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

### Step 6: Apply Database Migrations

```bash
# Install EF Tools (one-time)
dotnet tool install --global dotnet-ef

# Apply migrations
dotnet ef database update

# Or manually apply SQL scripts
psql -h localhost -U contractiq_user -d contractiq_dev -f ../../database/migrations/001_initial_schema.sql
```

### Step 7: Run Backend Server

```bash
dotnet run

# Or for development with hot reload
dotnet watch run

# Backend will be running at: http://localhost:5000
# Swagger UI: http://localhost:5000/swagger
```

---

## Frontend Setup

### Step 1: Install Node.js

```bash
# Windows (using Chocolatey)
choco install nodejs

# macOS (using Homebrew)
brew install node

# Linux (Ubuntu)
sudo apt-get install nodejs npm
```

### Step 2: Verify Node Installation

```bash
node --version    # Should be 18.x or higher
npm --version     # Should be 9.x or higher
```

### Step 3: Navigate to Frontend Directory

```bash
cd RedMPS_Contract/src/frontend
```

### Step 4: Install Dependencies

```bash
npm install

# Or with npm ci for exact versions (recommended for CI/CD)
npm ci
```

### Step 5: Configure Environment

Create `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  apiTimeout: 30000,
  jwtTokenKey: 'access_token',
  jwtRefreshTokenKey: 'refresh_token'
};
```

### Step 6: Start Development Server

```bash
npm start

# Frontend will be running at: http://localhost:4200
```

---

## Database Setup

### Option 1: Using Docker

```bash
# Start PostgreSQL container
docker run --name contractiq-postgres \
  -e POSTGRES_USER=contractiq_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=contractiq_dev \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine
```

### Option 2: Local Installation

```bash
# Windows (using Chocolatey)
choco install postgresql

# macOS (using Homebrew)
brew install postgresql@15

# Linux (Ubuntu)
sudo apt-get install postgresql postgresql-contrib
```

### Step 3: Create Database and User

```bash
# Connect to PostgreSQL
psql -U postgres

# Run these SQL commands:
CREATE USER contractiq_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE contractiq_dev OWNER contractiq_user;
GRANT ALL PRIVILEGES ON DATABASE contractiq_dev TO contractiq_user;

# Exit psql
\q
```

### Step 4: Apply Database Schema

```bash
# Using SQL script
psql -h localhost -U contractiq_user -d contractiq_dev \
  -f database/migrations/001_initial_schema.sql

# Or using Entity Framework Core (from backend folder)
dotnet ef database update
```

### Step 5: Verify Database

```bash
# Connect to database
psql -h localhost -U contractiq_user -d contractiq_dev

# List tables
\dt

# Check users table
SELECT * FROM users;

# Exit psql
\q
```

---

## Environment Configuration

### Create `.env` File

Copy from template and customize:

```bash
cp config/.env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=contractiq_dev
DATABASE_USER=contractiq_user
DATABASE_PASSWORD=your_secure_password

# API
API_HOST=http://localhost:5000
API_PORT=5000

# Frontend
FRONTEND_URL=http://localhost:4200

# JWT
JWT_SECRET_KEY=your_super_secret_key_min_32_chars_here
```

### Important: Never Commit .env File

Add to `.gitignore`:

```
.env
.env.local
.env.*.local
```

---

## Verification

### Backend Health Check

```bash
# Check backend is running
curl http://localhost:5000/health

# Expected response:
# {"status":"Healthy","timestamp":"2026-06-05T10:30:00Z"}
```

### Frontend Health Check

```bash
# Open browser
http://localhost:4200

# Should see ContractIQ login page
```

### API Documentation

```
# View OpenAPI documentation
http://localhost:5000/swagger/ui
```

### Database Connection

```bash
# Connect to database
psql -h localhost -U contractiq_user -d contractiq_dev

# Run test query
SELECT COUNT(*) FROM users;
```

---

## Project Startup Checklist

Before starting development:

- ✅ .NET SDK 8.0+ installed and verified
- ✅ PostgreSQL installed and running
- ✅ Node.js 18+ installed and verified
- ✅ Repository cloned
- ✅ `.env` file created and configured
- ✅ Database migrations applied
- ✅ NuGet packages restored (backend)
- ✅ NPM packages installed (frontend)
- ✅ Backend server running on port 5000
- ✅ Frontend server running on port 4200
- ✅ Can access http://localhost:4200
- ✅ Can access http://localhost:5000/swagger

---

## Development Commands Reference

### Backend Commands

```bash
cd src/backend

# Run development server with hot reload
dotnet watch run

# Run in production mode
dotnet run --configuration Release

# Build project
dotnet build

# Run tests
dotnet test

# Apply migrations
dotnet ef database update

# Create new migration
dotnet ef migrations add MigrationName

# View EF migrations
dotnet ef migrations list
```

### Frontend Commands

```bash
cd src/frontend

# Start development server
npm start

# Build for production
npm run build:prod

# Run unit tests
npm test

# Run E2E tests
npm run e2e

# Format code with Prettier
npm run format

# Check code format
npm run format:check

# Lint TypeScript and HTML
npm run lint
```

### Docker Commands

```bash
# Start all services
docker-compose -f config/docker-compose.yml up -d

# Stop services
docker-compose -f config/docker-compose.yml down

# View logs
docker-compose -f config/docker-compose.yml logs -f

# View specific service logs
docker-compose -f config/docker-compose.yml logs -f backend

# Rebuild containers
docker-compose -f config/docker-compose.yml up -d --build
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000

# Kill process
# Windows
taskkill /PID <PID> /F

# macOS/Linux
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
psql -h localhost -U contractiq_user -d contractiq_dev

# Check connection string in appsettings.json
# Verify DATABASE_USER and DATABASE_PASSWORD match
# Verify database exists: SELECT datname FROM pg_database;
```

### Backend Won't Start

```bash
# Clear project cache
dotnet clean

# Restore packages
dotnet restore

# Try building again
dotnet build

# Check for .NET SDK issues
dotnet --info
```

### Frontend Won't Start

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules
npm install

# Check Node version
node --version

# Try starting again
npm start
```

### Port Conflicts

```bash
# Change backend port in launchSettings.json
# Change frontend port in angular.json

# Or use environment variables
export API_PORT=5001
export FRONTEND_PORT=4201
```

### Docker Issues

```bash
# Check if Docker daemon is running
docker ps

# Remove dangling containers
docker container prune

# Rebuild images
docker-compose -f config/docker-compose.yml build --no-cache

# Full reset (WARNING: deletes all data)
docker-compose -f config/docker-compose.yml down -v
```

---

## IDE Configuration

### Visual Studio Code - Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": ".NET Core Attach",
      "type": "coreclr",
      "request": "attach",
      "processId": "${command:pickProcess}"
    },
    {
      "name": "Angular Debug",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:4200",
      "webRoot": "${workspaceFolder}/src/frontend"
    }
  ]
}
```

### Visual Studio Code - Tasks

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Backend",
      "command": "dotnet",
      "args": ["run"],
      "cwd": "${workspaceFolder}/src/backend",
      "problemMatcher": "$msCompile"
    },
    {
      "label": "Start Frontend",
      "command": "npm",
      "args": ["start"],
      "cwd": "${workspaceFolder}/src/frontend",
      "problemMatcher": []
    }
  ]
}
```

---

## Next Steps

1. ✅ Complete setup following this guide
2. ✅ Review [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
3. ✅ Read [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for UI components
4. ✅ Study [API_SPECIFICATION.md](API_SPECIFICATION.md)
5. ✅ Check [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

---

## Getting Help

- **Setup Issues**: Check [Troubleshooting](#troubleshooting) section
- **API Questions**: Review [API_SPECIFICATION.md](API_SPECIFICATION.md)
- **Database Questions**: Review [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- **Architecture Questions**: Review [PRODUCT_STRATEGY.md](PRODUCT_STRATEGY.md)
- **UI/UX Questions**: Review [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

---

**Version**: 1.0  
**Last Updated**: June 5, 2026  
**Status**: Production Ready
