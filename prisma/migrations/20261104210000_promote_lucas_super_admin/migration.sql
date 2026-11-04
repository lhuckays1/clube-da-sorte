DO $$
DECLARE
  target_user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO target_user_count
  FROM "Usuario"
  WHERE LOWER("email") = LOWER('lucas@athomo.com');

  IF current_database() = 'clubedasorte_db' AND target_user_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one account for lucas@athomo.com, found %', target_user_count;
  END IF;

  UPDATE "Usuario"
  SET "role" = 'SUPER_ADMIN'
  WHERE LOWER("email") = LOWER('lucas@athomo.com');
END $$;
