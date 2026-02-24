export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizePin(pin) {
  return String(pin || "").trim();
}

export function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num));
}

export function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

export function scoreColor(score) {
  if (score >= 80) return "var(--good)";
  if (score >= 50) return "var(--mid)";
  return "var(--bad)";
}

export function mediaLabel(type) {
  const labels = {
    movie: "Movie",
    series: "TV Series",
    "mini-series": "Mini-Series",
    documentary: "Documentary",
    "short-film": "Short Film",
    book: "Book",
    other: "Other"
  };
  return labels[type] || type || "Media";
}

export function parseGenres(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

export function optimizeCoverUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  let next = raw;

  // Google Books thumbnails can often be requested at a higher zoom level.
  if (next.includes("books.google")) {
    if (/[?&]zoom=\d/.test(next)) {
      next = next.replace(/([?&]zoom=)\d/, "$13");
    } else {
      next += (next.includes("?") ? "&" : "?") + "zoom=3";
    }
  }

  // Amazon/IMDb poster URLs often embed a size token; request a larger source.
  next = next.replace(/\._V1_[^./]+\./, "._V1_SY1000_CR0,0,675,1000_AL_.");

  return next;
}
