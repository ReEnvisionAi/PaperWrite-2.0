/*
  # Create documents table and policies

  This migration creates the `documents` table to store user-generated documents
  and sets up Row Level Security (RLS) policies to ensure users can only
  access and modify their own data.

  1. New Tables
     - `documents`
       - `id` (uuid, primary key): Unique identifier for each document.
       - `user_id` (uuid, foreign key): Links to the authenticated user (`auth.users`).
       - `title` (text): The overall title of the saved document.
       - `rows` (jsonb): Stores the array of `DocumentRow` objects representing the document sections.
       - `created_at` (timestamptz): Timestamp of creation.
       - `updated_at` (timestamptz): Timestamp of last update.

  2. Security
     - Enable RLS on the `documents` table.
     - Add policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE` allowing authenticated users to manage their own documents based on `user_id`.

  3. Indexes
     - Add an index on `user_id` for faster lookups of user documents.
*/

-- 1. Create Table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT '',
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Add Index
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

-- 3. Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
CREATE POLICY "Users can view their own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
CREATE POLICY "Users can insert their own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
CREATE POLICY "Users can update their own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
CREATE POLICY "Users can delete their own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
