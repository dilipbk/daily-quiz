-- Up Migration
-- Holds the advisory lock long enough for the smoke script to start a second run beside it.
SELECT pg_sleep(5);
