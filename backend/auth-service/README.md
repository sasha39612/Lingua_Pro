# Auth Service

Responsible for user registration, login, JWT issuance, and role management. Supports student and admin roles, password hashing, and secure session handling.

## Responsibilities

- **User Registration**: Create new user accounts with email/password validation.
- **User Login**: Authenticate users and issue JWT tokens for session management.
- **JWT Token Management**: Generate, validate, and refresh JWT tokens with appropriate expiry.
- **Role Management**: Maintain user roles (student/admin) and enforce role-based access.
- **Password Security**: Hash passwords using bcrypt or similar, never store plaintext.
- **Session Handling**: Manage active sessions and token revocation on logout.
- **Health Check**: Exposes `/health` endpoint for monitoring.

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Framework**: NestJS
- **Database**: PostgreSQL (via shared db connection)
- **ORM**: Prisma with `@nestjs/prisma` integration
- **Password Hashing**: bcrypt
- **JWT Library**: @nestjs/jwt

## Communication

- **Inbound**: API Gateway calls auth-service endpoints via internal Docker network.
- **Outbound**: Does not call other microservices directly; returns responses to API Gateway.

## Database Tables

Primarily uses the `users` table:
- Stores user credentials, hashed passwords, roles, and language preferences
- Enforces unique email constraint
- Manages student/admin role assignment