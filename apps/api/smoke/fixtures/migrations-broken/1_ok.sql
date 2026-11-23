-- Up Migration
-- A good migration in the same run as a broken one: it must not survive the failure.
CREATE TABLE smoke_ok (id integer PRIMARY KEY);

-- Down Migration
DROP TABLE smoke_ok;
