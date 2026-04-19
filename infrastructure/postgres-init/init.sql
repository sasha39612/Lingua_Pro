-- Creates one database per service.
-- This script runs once on first container startup (postgres docker-entrypoint-initdb.d).
-- The default database (POSTGRES_DB=lingua_admin) is reserved for admin/tooling access.

\c postgres

CREATE DATABASE auth_db;
CREATE DATABASE text_db;
CREATE DATABASE audio_db;
CREATE DATABASE ai_orchestrator_db;

-- Grant the app user full access to each database
GRANT ALL PRIVILEGES ON DATABASE auth_db TO lingua;
GRANT ALL PRIVILEGES ON DATABASE text_db TO lingua;
GRANT ALL PRIVILEGES ON DATABASE audio_db TO lingua;
GRANT ALL PRIVILEGES ON DATABASE ai_orchestrator_db TO lingua;
