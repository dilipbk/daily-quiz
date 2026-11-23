-- Up Migration
CREATE TABLE smoke_sample (id integer PRIMARY KEY, label text NOT NULL);

-- Down Migration
DROP TABLE smoke_sample;
