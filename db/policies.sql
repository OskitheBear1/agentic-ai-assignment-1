-- ---------------------------------------------------------------------------
-- Row Level Security for contacts
--
-- RLS is the real security boundary of this application. Even though every
-- request also passes through JWT verification and Zod validation in the Node
-- backend, Postgres independently refuses to return or modify a row that does
-- not belong to the caller.
--
-- `auth.user_id()` = the `sub` claim of the JWT that the Data API verified.
-- The rule is the same in all four policies: auth.user_id() = user_id.
--
-- Four separate policies (SELECT / INSERT / UPDATE / DELETE) rather than one
-- FOR ALL policy, so each operation's rule is explicit and auditable.
--
--   USING      -> which existing rows the operation may touch
--   WITH CHECK -> what the row is allowed to look like AFTER the write
--
-- The WITH CHECK on UPDATE is what stops a user from handing their row to
-- somebody else: the row must still belong to them once the update is applied.
-- ---------------------------------------------------------------------------

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Belt and braces: apply RLS to the table owner too, so no path bypasses it.
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_select_own ON contacts;
DROP POLICY IF EXISTS contacts_insert_own ON contacts;
DROP POLICY IF EXISTS contacts_update_own ON contacts;
DROP POLICY IF EXISTS contacts_delete_own ON contacts;

-- Read only your own contacts.
CREATE POLICY contacts_select_own ON contacts
  FOR SELECT
  TO authenticated
  USING (auth.user_id() = user_id);

-- Insert only rows that belong to you.
CREATE POLICY contacts_insert_own ON contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.user_id() = user_id);

-- Update only your own rows, and they must still be yours afterwards.
CREATE POLICY contacts_update_own ON contacts
  FOR UPDATE
  TO authenticated
  USING (auth.user_id() = user_id)
  WITH CHECK (auth.user_id() = user_id);

-- Delete only your own rows.
CREATE POLICY contacts_delete_own ON contacts
  FOR DELETE
  TO authenticated
  USING (auth.user_id() = user_id);

-- The Data API's `authenticated` role needs table privileges; RLS then narrows
-- them to the caller's own rows. (Neon applies these when you enable public
-- schema access, but they are repeated here so the migration is self-contained.)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE contacts TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- The anonymous role gets nothing. Signed-out visitors cannot read contacts.
-- (Guarded: the role only exists once the Data API has been enabled.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    REVOKE ALL ON TABLE contacts FROM anonymous;
  END IF;
END
$$;
