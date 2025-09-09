-- Database initialization script for LoveConnect
-- This script sets up the database with proper extensions and initial configuration

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created by Prisma migrations, but we ensure they exist

-- Set timezone
SET timezone = 'UTC';

-- Create a function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'LoveConnect database initialized successfully';
END $$;
