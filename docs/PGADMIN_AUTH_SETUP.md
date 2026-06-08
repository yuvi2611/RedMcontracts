# ContractIQ PostgreSQL and Login Setup

ContractIQ uses PostgreSQL as the system of record. Users do not self-register.
Accounts must be created by an active superuser.

## pgAdmin Connection

If you run the included Docker pgAdmin service, open:

```text
http://localhost:5050
```

Default pgAdmin login for local development:

```text
Email: admin@redmps.com
Password: pass
```

The pgAdmin server entry is preconfigured by:

```text
config/pgadmin-servers.json
```

Docker pgAdmin connects to PostgreSQL using the Docker service host:

```text
Host: postgres
Port: 5432
Database: RedMPS Contracts
Username: postgres
Password: pass
```

If you are using locally installed pgAdmin instead of Docker pgAdmin, create a server manually:

```text
Host: localhost
Port: 5432
Maintenance database: RedMPS Contracts
Username: postgres
Password: pass
```

The backend development connection string is captured in:

```text
config/appsettings.Development.json
```

## Application Login

The demo login page intentionally has no register link.

Seeded local superuser:

```text
Email: admin@redmps.com
Temporary password: ChangeMe!2026
```

The first production implementation should force a password change after this seeded login.

## Manual User Creation

Migration `002_auth_manual_users.sql` adds a guarded database function:

```sql
SELECT create_user_as_superuser(
  '<active-superuser-id>',
  'hr.user@redmps.com',
  'HR',
  'User',
  '<role-id>',
  NULL,
  'TemporaryPass!2026'
);
```

The function rejects calls unless `p_actor_user_id` belongs to an active superuser.

Application-level user creation should expose this only through an authenticated admin screen/API.
Public registration must remain disabled.
