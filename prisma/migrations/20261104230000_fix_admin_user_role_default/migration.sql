-- Users created from the administration panel are administrator accounts.
-- Older releases accidentally inherited OPERATOR, a role that cannot sign in.
UPDATE "Usuario"
SET "role" = 'ADMIN'
WHERE LOWER("email") = LOWER('teste@athomo.com')
  AND "role" = 'OPERATOR';

ALTER TABLE "Usuario"
ALTER COLUMN "role" SET DEFAULT 'ADMIN';
