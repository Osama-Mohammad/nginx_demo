// Books API — plain Node.js (no framework) + PostgreSQL.
//
// Endpoints:
//   GET    /api/health         -> { status: "ok" }
//   GET    /api/books?q=term   -> list books (optional search)
//   POST   /api/books          -> create { title, author, year }
//   DELETE /api/books/:id      -> delete a book
//
// Config (environment variables):
//   PORT          API port                    (default 3000)
//   CORS_ORIGIN   allowed frontend origin     (default *)
//   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

const http = require("http");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT) || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "books",
  password: process.env.DB_PASSWORD || "books",
  database: process.env.DB_NAME || "books",
});

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(data === undefined ? "" : JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) reject(new Error("Body too large"));
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/+$/, "");

  try {
    if (req.method === "OPTIONS") return send(res, 204);

    if (req.method === "GET" && path === "/api/health") {
      await pool.query("SELECT 1");
      return send(res, 200, { status: "ok" });
    }

    if (req.method === "GET" && path === "/api/books") {
      const q = (url.searchParams.get("q") || "").trim();
      const result = q
        ? await pool.query(
            "SELECT id, title, author, year FROM books WHERE title ILIKE $1 OR author ILIKE $1 ORDER BY id",
            [`%${q}%`]
          )
        : await pool.query("SELECT id, title, author, year FROM books ORDER BY id");
      return send(res, 200, result.rows);
    }

    if (req.method === "POST" && path === "/api/books") {
      const { title, author, year } = await readJson(req);
      if (!title || !author || !String(title).trim() || !String(author).trim()) {
        return send(res, 400, { error: "title and author are required" });
      }
      const y = year === undefined || year === null || year === "" ? null : parseInt(year, 10);
      if (y !== null && Number.isNaN(y)) return send(res, 400, { error: "year must be a number" });

      const result = await pool.query(
        "INSERT INTO books (title, author, year) VALUES ($1, $2, $3) RETURNING id, title, author, year",
        [String(title).trim(), String(author).trim(), y]
      );
      return send(res, 201, result.rows[0]);
    }

    const match = path.match(/^\/api\/books\/(\d+)$/);
    if (req.method === "DELETE" && match) {
      const result = await pool.query("DELETE FROM books WHERE id = $1", [match[1]]);
      if (result.rowCount === 0) return send(res, 404, { error: "Book not found" });
      return send(res, 204);
    }

    send(res, 404, { error: "Not found" });
  } catch (err) {
    console.error(err);
    const status = err.message === "Invalid JSON" || err.message === "Body too large" ? 400 : 500;
    send(res, status, { error: status === 400 ? err.message : "Internal server error" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Books API listening on port ${PORT}`);
});

// Graceful shutdown (useful in Docker)
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
