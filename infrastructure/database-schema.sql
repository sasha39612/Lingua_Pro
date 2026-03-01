-- PostgreSQL Database Schema for Lingua Pro
-- English Language Learning Platform with AI Feedback

-- Users table: stores student and admin accounts
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'admin')),
    language VARCHAR(50) NOT NULL DEFAULT 'english',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Texts table: stores writing and reading task results
CREATE TABLE IF NOT EXISTS texts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    original_text TEXT NOT NULL,
    corrected_text TEXT,
    text_score FLOAT,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_texts_user_id ON texts(user_id);
CREATE INDEX idx_texts_language ON texts(language);
CREATE INDEX idx_texts_created_at ON texts(created_at);

-- Audio records table: stores speaking and listening task results
CREATE TABLE IF NOT EXISTS audio_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    transcript TEXT,
    pronunciation_score FLOAT,
    feedback TEXT,
    audio_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audio_records_user_id ON audio_records(user_id);
CREATE INDEX idx_audio_records_language ON audio_records(language);
CREATE INDEX idx_audio_records_created_at ON audio_records(created_at);

-- Tasks table: AI-generated tasks per level and language (optional but recommended)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    language VARCHAR(50) NOT NULL,
    level VARCHAR(10) NOT NULL CHECK (level IN ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    skill VARCHAR(50) NOT NULL CHECK (skill IN ('listening', 'reading', 'writing', 'speaking')),
    prompt TEXT NOT NULL,
    audio_url VARCHAR(500),
    reference_text TEXT,
    answer_options TEXT[],
    correct_answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_language ON tasks(language);
CREATE INDEX idx_tasks_level ON tasks(level);
CREATE INDEX idx_tasks_skill ON tasks(skill);
