-- Up Migration
-- Fails halfway on purpose: the first statement succeeds, the second is a syntax error.
CREATE TABLE smoke_half (id integer PRIMARY KEY);
CREATE TABLE smoke_broken (id integer PRIMARY KEY,);
