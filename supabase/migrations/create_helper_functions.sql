/*
      # Create Helper Functions

      This migration adds helper functions to the database schema.

      1. New Functions
         - `create_table_if_not_exists(table_name TEXT, schema TEXT)`
           - **Purpose**: Creates a new table with the specified name and schema definition only if a table with that name does not already exist.
           - **Arguments**:
             - `table_name`: The name of the table to create.
             - `schema`: A string containing the column definitions and constraints for the table (e.g., 'id SERIAL PRIMARY KEY, name TEXT').
           - **Returns**: `VOID`
           - **Usage**: Useful for ensuring application tables exist before performing operations, especially during initialization or dynamic table creation scenarios.

      2. Security
         - Functions are owned by the user creating them (typically the `postgres` role via migrations).
         - Access control depends on standard PostgreSQL function permissions. By default, `PUBLIC` usually has `EXECUTE` permission unless revoked.

      3. Notes
         - This function uses dynamic SQL (`EXECUTE`) and should be used carefully. Ensure the `table_name` and `schema` inputs are properly controlled to prevent SQL injection if called directly from less trusted contexts (though typically called via migrations or controlled server-side logic).
         - The function checks `pg_tables` in the current schema context.
    */

    CREATE OR REPLACE FUNCTION create_table_if_not_exists(table_name TEXT, schema TEXT)
    RETURNS VOID AS $$
    BEGIN
      -- Check if the table exists in the public schema (adjust if using different schemas)
      IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_tables
        WHERE schemaname = 'public' -- Or use a variable/parameter if needed
        AND tablename = table_name
      ) THEN
        -- Construct and execute the CREATE TABLE statement
        EXECUTE 'CREATE TABLE public.' || quote_ident(table_name) || ' (' || schema || ')';
        RAISE NOTICE 'Table "%" created.', table_name;
      ELSE
        RAISE NOTICE 'Table "%" already exists.', table_name;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
