# Auth Service

Responsible for user registration, login, JWT issuance, and role management. Supports student and admin roles, password hashing, and secure session handling.

## Responsibilities

- **User Registration**: Create new user accounts with email/password validation.
- **User Login**: Authenticate users and issue JWT tokens for session management.
- **JWT Token Management**: Generate, validate, and refresh JWT tokens with appropriate expiry.
- **Role Management**: Maintain user roles (student/admin), enforce role-based access, and support admin-only role updates.
- **Password Security**: Hash passwords using argon2 (strong memory-hard algorithm); never store plaintext.
- **Session Handling**: Maintain a sessions table to track active JWTs and support logout/token revocation via mutations.
- **Health Check**: Exposes `/health` endpoint for monitoring.

## GraphQL API

- **Endpoint**: `POST /graphql`
- **Mutations**: `register`, `login`, `refreshToken`, `logout`, `updateUserRole`
- **Queries**: `me`, `user`, `validateToken`

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Framework**: Lightweight Node.js HTTP server + GraphQL subgraph schema
- **Database**: PostgreSQL (via shared db connection)
- **ORM**: Prisma Client 7 with `@prisma/adapter-pg`
- **Password Hashing**: argon2
- **JWT Library**: jsonwebtoken

> **Note**: Install `@types/jsonwebtoken` for TypeScript or rely on the provided shim (`src/types/jsonwebtoken.d.ts`).

## Communication

- **Inbound**: API Gateway calls auth-service endpoints via internal Docker network.
- **Outbound**: Does not call other microservices directly; returns responses to API Gateway.

## Database Tables

Primarily uses the `users` table:
- Stores user credentials, hashed passwords, roles, and language preferences
- Enforces unique email constraint
- Manages student/admin role assignment

**Troubleshooting**: If TypeScript reports errors such as `Cannot find module 'jsonwebtoken'`, ensure the library and its type definitions are installed. Alternatively, keep the declaration shim in `src/types/jsonwebtoken.d.ts`.
