# Books App

A small three-part web app, each part meant to run in its own container on its own port:

| Part       | Folder       | Tech                              | Default port |
|------------|--------------|-----------------------------------|--------------|
| Frontend   | `frontend/`  | Plain HTML, CSS, JS (served by nginx) | 8080     |
| Backend    | `backend/`   | Node.js (built-in `http`, only dependency: `pg`) | 3000 |
| Database   | `database/`  | PostgreSQL (`init.sql`)           | 5432         |

```
Browser ──► nginx :8080 (frontend files)
   │
   └──fetch──► Node API :3000 ──► PostgreSQL :5432
```

The browser can't talk to a database directly, so the frontend calls the API
and the API talks to PostgreSQL.

## Folder layout

```
books-app/
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── config.js     # API_URL — edit to point at your backend
│       └── app.js
├── backend/
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
└── database/
    └── init.sql          # schema + sample data
```

## 1. Database (PostgreSQL)

- Use the official `postgres` image.
- Copy `database/init.sql` into `/docker-entrypoint-initdb.d/` — it runs
  automatically the first time the database is created.
- Set `POSTGRES_USER=books`, `POSTGRES_PASSWORD=books`, `POSTGRES_DB=books`
  (or your own values — just match them in the backend).

Table:

```sql
books (id SERIAL PK, title TEXT, author TEXT, year INTEGER, created_at TIMESTAMPTZ)
```

## 2. Backend (Node.js API)

Install and start:

```
npm ci          # or: npm install
npm start
```

Environment variables:

| Variable      | Default     | Notes |
|---------------|-------------|-------|
| `PORT`        | `3000`      | Port the API listens on |
| `DB_HOST`     | `localhost` | Use the DB container/service name in Docker |
| `DB_PORT`     | `5432`      | |
| `DB_USER`     | `books`     | |
| `DB_PASSWORD` | `books`     | |
| `DB_NAME`     | `books`     | |
| `CORS_ORIGIN` | `*`         | Set to your frontend origin, e.g. `http://localhost:8080` |

Endpoints:

| Method | Path               | Description |
|--------|--------------------|-------------|
| GET    | `/api/health`      | Health check (also checks the DB) |
| GET    | `/api/books?q=...` | List books, optional search on title/author |
| POST   | `/api/books`       | Create: `{ "title", "author", "year" }` |
| DELETE | `/api/books/:id`   | Delete a book |

## 3. Frontend (nginx)

- Copy the contents of `frontend/` to `/usr/share/nginx/html` in an `nginx` image.
- Edit `frontend/js/config.js` so `API_URL` points to where the backend is
  reachable **from the user's browser** (e.g. `http://localhost:3000`), not the
  Docker-internal hostname.

### Optional: one port only

If you'd rather expose just nginx, you can proxy the API through it and set
`API_URL: ""` in `config.js`:

```nginx
location /api/ {
    proxy_pass http://backend:3000;
}
```
