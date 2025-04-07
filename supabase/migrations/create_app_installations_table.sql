/*
  # Create app_installations table

  This migration creates the `app_installations` table, which is required by
  the ReEnvision OS SDK (`@reenvision-ai/reai-os-sdk`) to track whether an
  application's one-time initialization logic has been executed for a specific user.

  1. New Tables
     - `app_installations`
       - `app_id` (text, primary key): Unique identifier for the application (e.g., 'business-writer').
       - `user_id` (uuid, primary key, foreign key): Links to the authenticated user (`auth.users`).
       - `initialized` (boolean): Flag indicating if the app's initialization ran for this user. Defaults to `false`.
       - `created_at` (timestamptz): Timestamp of creation.
       - `updated_at` (timestamptz): Timestamp of last update.

  2. Security
     - Enable RLS on the `app_installations` table.
     - Add policies allowing authenticated users to manage their *own* installation records (`SELECT`, `INSERT`, `UPDATE`). The SDK uses `UPSERT`, which requires `INSERT` and `UPDATE`.

  3. Indexes
     - The composite primary key `(app_id, user_id)` serves as the main index.

  4. Triggers
     - Add a trigger to automatically update the `updated_at` timestamp on changes.
*/

-- 1. Create Table
CREATE TABLE IF NOT EXISTS app_installations (
  app_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  initialized boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (app_id, user_id) -- Composite primary key
);

-- 2. Enable RLS
ALTER TABLE app_installations ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own app installation status" ON app_installations;
CREATE POLICY "Users can view their own app installation status"
  ON app_installations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own app installation status" ON app_installations;
CREATE POLICY "Users can insert their own app installation status"
  ON app_installations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own app installation status" ON app_installations;
CREATE POLICY "Users can update their own app installation status"
  ON app_installations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Trigger to update 'updated_at' timestamp (using the existing function if created by previous migration)
DROP TRIGGER IF EXISTS update_app_installations_updated_at ON app_installations;
CREATE TRIGGER update_app_installations_updated_at
  BEFORE UPDATE ON app_installations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); -- Assumes function exists from 'create_documents_table.sql'
