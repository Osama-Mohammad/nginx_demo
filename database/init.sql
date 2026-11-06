-- Books database schema + sample data (PostgreSQL)
-- The official postgres Docker image runs any .sql file placed in
-- /docker-entrypoint-initdb.d/ the first time the database is created.

CREATE TABLE IF NOT EXISTS books (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  author     TEXT NOT NULL,
  year       INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO books (title, author, year) VALUES
  ('1984', 'George Orwell', 1949),
  ('To Kill a Mockingbird', 'Harper Lee', 1960),
  ('The Great Gatsby', 'F. Scott Fitzgerald', 1925),
  ('Pride and Prejudice', 'Jane Austen', 1813),
  ('The Hobbit', 'J.R.R. Tolkien', 1937),
  ('Brave New World', 'Aldous Huxley', 1932);
