// Books App frontend — talks to the backend REST API.

const API = `${window.APP_CONFIG.API_URL.replace(/\/+$/, "")}/api`;
const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function loadBooks() {
  const q = $("search").value.trim();
  try {
    const books = await api(q ? `/books?q=${encodeURIComponent(q)}` : "/books");
    render(books);
  } catch (err) {
    $("book-list").innerHTML =
      `<tr><td colspan="5">Could not reach the API at ${escapeHtml(API)} — ${escapeHtml(err.message)}</td></tr>`;
  }
}

function render(books) {
  $("book-list").innerHTML = books.length
    ? books.map((b) => `
        <tr>
          <td>${b.id}</td>
          <td>${escapeHtml(b.title)}</td>
          <td>${escapeHtml(b.author)}</td>
          <td>${b.year ?? ""}</td>
          <td><button class="link" data-id="${b.id}">Delete</button></td>
        </tr>`).join("")
    : `<tr><td colspan="5" class="muted">No books found.</td></tr>`;
}

function setStatus(msg) { $("status").textContent = msg; }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// ---- events ----
$("book-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("title").value.trim();
  const author = $("author").value.trim();
  const year = $("year").value ? parseInt($("year").value, 10) : null;
  try {
    const book = await api("/books", {
      method: "POST",
      body: JSON.stringify({ title, author, year }),
    });
    e.target.reset();
    $("title").focus();
    setStatus(`Added "${book.title}".`);
    loadBooks();
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
});

$("book-list").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  try {
    await api(`/books/${btn.dataset.id}`, { method: "DELETE" });
    setStatus(`Deleted book #${btn.dataset.id}.`);
    loadBooks();
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
});

let searchTimer;
$("search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadBooks, 250);
});

loadBooks();
