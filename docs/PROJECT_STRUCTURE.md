# ContractIQ Project Structure Guide

## Overview
Complete production-ready project structure for the RedMPS HR Contract Generation Platform.

---

## Project Root Directory Layout

```
RedMPS_Contract/
├── src/                          # Source code directory
│   ├── frontend/                 # Angular application
│   │   ├── app/                  # Angular application root
│   │   │   ├── core/             # Singleton services, guards, interceptors
│   │   │   │   ├── auth/         # Authentication service & guards
│   │   │   │   ├── http/         # HTTP interceptors
│   │   │   │   ├── models/       # TypeScript interfaces & types
│   │   │   │   └── services/     # Core application services
│   │   │   ├── shared/           # Shared components, pipes, directives
│   │   │   │   ├── components/   # Reusable UI components
│   │   │   │   ├── pipes/        # Custom pipes
│   │   │   │   ├── directives/   # Custom directives
│   │   │   │   └── utils/        # Utility functions
│   │   │   ├── modules/          # Feature modules (lazy-loaded)
│   │   │   │   ├── dashboard/    # Dashboard module
│   │   │   │   ├── contracts/    # Contract management module
│   │   │   │   ├── wizard/       # Contract creation wizard
│   │   │   │   ├── employees/    # Employee management module
│   │   │   │   ├── templates/    # Template management
│   │   │   │   ├── approvals/    # Approval workflows
│   │   │   │   ├── analytics/    # Analytics & reporting
│   │   │   │   └── admin/        # Administration panel
│   │   │   ├── layouts/          # Layout components
│   │   │   │   ├── sidebar-layout/
│   │   │   │   ├── main-layout/
│   │   │   │   └── auth-layout/
│   │   │   ├── app.module.ts     # Main application module
│   │   │   ├── app.component.ts  # Root component
│   │   │   └── app-routing.module.ts
│   │   ├── assets/               # Static assets
│   │   │   ├── images/           # Image files
│   │   │   ├── icons/            # Icon set
│   │   │   └── fonts/            # Custom fonts
│   │   ├── styles/               # Global and component styles
│   │   │   ├── design-tokens/    # Design system tokens
│   │   │   │   ├── colors.scss
│   │   │   │   ├── typography.scss
│   │   │   │   └── spacing-shadows.scss
│   │   │   ├── components/       # Component-specific styles
│   │   │   │   ├── buttons.scss
│   │   │   │   ├── forms.scss
│   │   │   │   ├── cards-badges.scss
│   │   │   │   ├── tables.scss
│   │   │   │   ├── modals.scss
│   │   │   │   └── animations.scss
│   │   │   ├── utilities/        # Utility classes
│   │   │   │   ├── spacing.scss
│   │   │   │   ├── display.scss
│   │   │   │   ├── flexbox.scss
│   │   │   │   └── responsive.scss
│   │   │   ├── global.scss       # Global styles
│   │   │   └── variables.scss    # SCSS variables
│   │   ├── environments/         # Environment configurations
│   │   │   ├── environment.ts    # Development
│   │   │   └── environment.prod.ts
│   │   ├── main.ts              # Application entry point
│   │   └── index.html           # HTML template
│   │
│   └── backend/                  # ASP.NET Core application
│       ├── Core/                 # Domain layer (entities, interfaces)
│       │   ├── Entities/         # Domain models
│       │   ├── Interfaces/       # Repository interfaces
│       │   ├── Models/           # Domain models
│       │   ├── Enums/            # Enumeration types
│       │   └── Exceptions/       # Custom exceptions
│       ├── Application/          # Application layer (business logic)
│       │   ├── Commands/         # CQRS commands
│       │   ├── Queries/          # CQRS queries
│       │   ├── DTOs/             # Data transfer objects
│       │   ├── Validators/       # Fluent validation rules
│       │   ├── Mappings/         # AutoMapper profiles
│       │   └── Services/         # Application services
│       ├── Infrastructure/       # Infrastructure layer
│       │   ├── Data/             # Database context & configuration
│       │   ├── Repositories/     # Repository implementations
│       │   ├── ExternalServices/ # Third-party integrations
│       │   ├── Email/            # Email service
│       │   ├── Files/            # File handling service
│       │   └── Persistence/      # Database migrations
│       ├── Api/                  # API layer (controllers)
│       │   ├── Controllers/      # REST API endpoints
│       │   ├── Middleware/       # Custom middleware
│       │   ├── Filters/          # Action filters
│       │   └── Security/         # Security policies
│       ├── Program.cs            # Application configuration
│       └── RedMPS.ContractIQ.Api.csproj
│
├── database/                     # Database-related files
│   └── migrations/               # SQL migration scripts
│       ├── 001_initial_schema.sql
│       ├── 002_add_audit_tables.sql
│       ├── 003_add_indexes.sql
│       └── README.md            # Migration documentation
│
├── api-spec/                     # API specifications
│   ├── openapi.json             # OpenAPI 3.0 specification
│   ├── postman-collection.json  # Postman collection
│   └── README.md                # API documentation
│
├── config/                       # Configuration files
│   ├── tsconfig.json            # TypeScript configuration
│   ├── frontend-package.json    # Frontend dependencies
│   ├── backend-csproj.xml       # Backend project structure
│   ├── Dockerfile.frontend      # Frontend container
│   ├── Dockerfile.backend       # Backend container
│   ├── docker-compose.yml       # Local development stack
│   ├── .env.example             # Environment variables template
│   └── README.md               # Configuration guide
│
├── docs/                         # Documentation
│   ├── PROJECT_SUMMARY.md       # Executive summary
│   ├── PRODUCT_STRATEGY.md      # Product vision & roadmap
│   ├── API_SPECIFICATION.md     # REST API docs
│   ├── DATABASE_SCHEMA.md       # Database design
│   ├── DESIGN_SYSTEM.md         # UI/UX specifications
│   ├── IMPLEMENTATION_GUIDE.md  # Development guide
│   ├── SETUP_GUIDE.md           # Getting started guide
│   ├── DEPLOYMENT.md            # Deployment instructions
│   ├── TESTING.md               # Testing strategy
│   └── TROUBLESHOOTING.md       # Common issues & solutions
│
├── .github/                      # GitHub configuration
│   ├── workflows/               # CI/CD workflows
│   │   ├── frontend-ci.yml      # Frontend build & test
│   │   ├── backend-ci.yml       # Backend build & test
│   │   └── deploy.yml           # Production deployment
│   └── pull_request_template.md
│
├── .gitignore                   # Git ignore rules
├── .dockerignore                # Docker ignore rules
├── .editorconfig                # Editor configuration
├── README.md                    # Project README
├── QUICK_REFERENCE.md           # Quick reference guide
├── PROJECT_SUMMARY.md           # This file (project overview)
└── LICENSE                      # License file
```

---

## Frontend Directory Details

### `/src/frontend/app/core/`
Core services and utilities used across the application:
- **auth/**: Authentication service, JWT interceptor, auth guards
- **http/**: HTTP error handler, request/response interceptors
- **models/**: TypeScript interfaces for models
- **services/**: API client, storage service, notification service

### `/src/frontend/app/shared/`
Reusable components and utilities:
- **components/**: Button, Card, Badge, Modal, Spinner, etc.
- **pipes/**: Date formatting, currency conversion pipes
- **directives/**: Focus management, click-outside directives
- **utils/**: Helper functions, validators, formatters

### `/src/frontend/app/modules/`
Feature modules (lazy-loaded for performance):
- Each module has its own routing, components, and services
- Examples: Dashboard, Contracts, Wizard, Employees, Analytics

### `/src/frontend/styles/`
Organized stylesheet structure:
- **design-tokens/**: Color, typography, spacing definitions
- **components/**: Component-specific styles
- **utilities/**: Responsive grid, spacing utilities
- **global.scss**: Global styles and resets

---

## Backend Directory Details

### `/src/backend/Core/`
Domain layer (business rules):
- **Entities/**: Database entity models
- **Interfaces/**: Repository and service contracts
- **Models/**: Domain models and value objects
- **Enums/**: Status enums (ContractStatus, EmploymentType, etc.)
- **Exceptions/**: Custom business exceptions

### `/src/backend/Application/`
Application layer (business logic):
- **Commands/**: CQRS command handlers for operations
- **Queries/**: CQRS query handlers for reads
- **DTOs/**: Data transfer objects for API requests/responses
- **Validators/**: FluentValidation rules
- **Mappings/**: AutoMapper profiles
- **Services/**: Business logic services

### `/src/backend/Infrastructure/`
Infrastructure layer (technical concerns):
- **Data/**: DbContext, database configuration
- **Repositories/**: Repository pattern implementations
- **ExternalServices/**: Third-party API clients
- **Email/**: Email service implementation
- **Files/**: File storage service
- **Persistence/**: Database connection strings

### `/src/backend/Api/`
API layer (REST endpoints):
- **Controllers/**: REST API endpoints
- **Middleware/**: Custom middleware (logging, error handling)
- **Filters/**: Action filters (authorization, validation)
- **Security/**: JWT validation, CORS policies

---

## Configuration Files Guide

### `config/tsconfig.json`
TypeScript compiler options for the frontend project:
- Strict mode enabled
- Path aliases for cleaner imports
- Source maps for debugging

### `config/frontend-package.json`
Frontend dependencies:
- Angular framework and libraries
- UI component libraries (Angular Material)
- Utilities (RxJS, date-fns, lodash)
- Development tools (Prettier, ESLint, TypeScript)

### `config/backend-csproj.xml`
Backend NuGet package references:
- ASP.NET Core framework
- Entity Framework Core
- CQRS (MediatR)
- Validation (FluentValidation)
- Authentication (JWT)
- Logging (Serilog)

### `config/.env.example`
Environment variables template:
- Database connection strings
- JWT secrets
- API endpoints
- Feature flags
- External service credentials

### `config/docker-compose.yml`
Local development stack:
- PostgreSQL database container
- ASP.NET Core backend container
- Angular frontend container
- Optional: pgAdmin, Redis

---

## Database Migration Strategy

### Migration Files Location
`database/migrations/`

### File Naming Convention
`000_description_of_change.sql`

### Examples
- `001_initial_schema.sql` - Create initial tables
- `002_add_audit_tables.sql` - Add audit logging
- `003_add_indexes.sql` - Add performance indexes
- `004_add_compliance_rules.sql` - Add compliance data

### Running Migrations
```bash
# Development
psql -h localhost -U contractiq_user -d contractiq_dev -f database/migrations/001_initial_schema.sql

# Production (using migration tool)
dotnet ef database update
```

---

## Development Workflow

### Setting Up Development Environment

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd RedMPS_Contract
   ```

2. **Configure Environment**
   ```bash
   cp config/.env.example .env
   # Edit .env with your local settings
   ```

3. **Start Services with Docker**
   ```bash
   docker-compose -f config/docker-compose.yml up -d
   ```

4. **Frontend Setup**
   ```bash
   cd src/frontend
   npm install
   npm start
   ```

5. **Backend Setup**
   ```bash
   cd src/backend
   dotnet restore
   dotnet ef database update
   dotnet run
   ```

### Directory Structure Summary

- **Source Code**: `src/frontend` and `src/backend`
- **Database**: `database/migrations`
- **API Docs**: `api-spec/openapi.json`
- **Configuration**: `config/` (all config files)
- **Documentation**: `docs/` (guides and specifications)

### File Organization Principles

1. **Feature-based organization** - Related files grouped by feature
2. **Separation of concerns** - Clear layers (Core, Application, Infrastructure, API)
3. **Reusability** - Shared components and utilities
4. **Scalability** - Easy to add new features
5. **Maintainability** - Clear naming conventions and structure

---

## Key File Locations

| Need | File Location |
|------|--------------|
| API Endpoints | `src/backend/Api/Controllers/` |
| Business Logic | `src/backend/Application/` |
| Database Models | `src/backend/Core/Entities/` |
| Database Context | `src/backend/Infrastructure/Data/` |
| UI Components | `src/frontend/app/shared/components/` |
| Page Components | `src/frontend/app/modules/*/components/` |
| Services | `src/frontend/app/core/services/` |
| Styles | `src/frontend/styles/` |
| Configuration | `config/` |
| Documentation | `docs/` |

---

## Next Steps

1. Review the [Setup Guide](SETUP_GUIDE.md) for environment configuration
2. Read the [Deployment Guide](DEPLOYMENT.md) for production setup
3. Check the [Testing Strategy](TESTING.md) for test coverage
4. Review component examples in the existing HTML prototype

---

**Last Updated**: June 5, 2026  
**Version**: 1.0  
**Status**: Production Ready
