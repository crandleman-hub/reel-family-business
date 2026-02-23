import { useEffect, useMemo, useState } from "react";

const GENRE_OPTIONS = [
  "Action",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "Horror",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "Other"
];

const TYPE_OPTIONS = ["movie", "series", "mini-series", "documentary", "book", "short-film", "other"];

const emptyEntry = {
  id: "",
  title: "",
  mediaType: "movie",
  year: "",
  genres: ["Other"],
  familyScore: 50,
  ageGuidance: 10,
  ratingLabel: "",
  review: "",
  pros: "",
  cons: "",
  coverUrl: "",
  sourceLookupId: "",
  sourceLookupProvider: "",
  authorName: "",
  emoji: "🎬",
  submitPin: ""
};

function flavorText(score) {
  if (score <= 10) return "Actual garbage. Congrats to everyone involved.";
  if (score <= 35) return "Rough watch. Bring snacks and low expectations.";
  if (score <= 60) return "Somewhere in the middle. Think harder.";
  if (score <= 85) return "Pretty solid. Worth the family time.";
  return "The greatest thing ever made. You better mean it.";
}

export default function EntryFormModal({
  open,
  initialEntry,
  activePin,
  onClose,
  onSave,
  onLookup,
  saving
}) {
  const [entry, setEntry] = useState(emptyEntry);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResults, setLookupResults] = useState([]);

  useEffect(() => {
    if (!open) return;
    const next = initialEntry
      ? {
          ...emptyEntry,
          ...initialEntry,
          genres: Array.isArray(initialEntry.genres) ? initialEntry.genres : [initialEntry.genres].filter(Boolean),
          submitPin: activePin || ""
        }
      : { ...emptyEntry, submitPin: activePin || "" };
    setEntry(next);
    setLookupQuery(initialEntry?.title || "");
    setLookupResults([]);
    setLookupError("");
  }, [open, initialEntry, activePin]);

  const primaryGenre = useMemo(
    () => (Array.isArray(entry.genres) && entry.genres.length ? entry.genres[0] : "Other"),
    [entry.genres]
  );

  if (!open) return null;

  async function handleLookup() {
    setLookupLoading(true);
    setLookupError("");
    setLookupResults([]);
    try {
      const result = await onLookup({ query: lookupQuery, mediaType: entry.mediaType });
      if (!result.ok) throw new Error(result.error || "Lookup failed");
      setLookupResults(result.results || []);
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  }

  function applyLookup(result) {
    setEntry((prev) => ({
      ...prev,
      title: result.title || prev.title,
      year: result.year || prev.year,
      genres: result.genres?.length ? result.genres : prev.genres,
      coverUrl: result.coverUrl || prev.coverUrl,
      ratingLabel: result.ratingLabel || prev.ratingLabel,
      sourceLookupId: result.sourceLookupId || "",
      sourceLookupProvider: result.sourceLookupProvider || ""
    }));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{entry.id ? "Edit the Corner" : "Add to the Corner"}</h2>
            <p className="modal-subtle">Score wisely. The team is watching.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="lookup-box kcc-lookup">
          <div className="lookup-label">AUTO-LOOKUP (TYPE TITLE + HIT SEARCH)</div>
          <div className="lookup-row">
            <input
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="Search by title..."
            />
            <button onClick={handleLookup} disabled={lookupLoading || !lookupQuery.trim()}>
              {lookupLoading ? "Searching..." : "Search"}
            </button>
          </div>
          {lookupError ? <div className="form-error">{lookupError}</div> : null}
          {lookupResults.length ? (
            <div className="lookup-results">
              {lookupResults.map((result) => (
                <div
                  key={result.sourceLookupId || `${result.title}-${result.year}`}
                  className="lookup-result-card"
                >
                  <div className="lookup-result-left">
                    <div className="lookup-thumb">
                      {result.coverUrl ? <img src={result.coverUrl} alt="" /> : <span>🎞️</span>}
                    </div>
                    <div>
                      <div className="lookup-result-title">{result.title}</div>
                      <div className="muted">
                        {[result.year, result.mediaType, (result.genres || [])[0]].filter(Boolean).join(" • ")}
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn-primary" onClick={() => applyLookup(result)}>
                    Use This
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <form
          className="entry-form kcc-entry-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              ...entry,
              familyScore: Number(entry.familyScore),
              ageGuidance: Number(entry.ageGuidance),
              submitPin: entry.submitPin,
              genres: Array.isArray(entry.genres)
                ? entry.genres
                : String(entry.genres || "")
                    .split(",")
                    .map((g) => g.trim())
                    .filter(Boolean)
            });
          }}
        >
          <label>
            Title *
            <input
              value={entry.title}
              onChange={(e) => setEntry((v) => ({ ...v, title: e.target.value }))}
              placeholder="Title..."
              required
            />
          </label>
          <label>
            Year
            <input
              value={entry.year}
              onChange={(e) => setEntry((v) => ({ ...v, year: e.target.value }))}
              placeholder="2024"
            />
          </label>

          <label>
            Genre
            <select
              value={primaryGenre}
              onChange={(e) => setEntry((v) => ({ ...v, genres: [e.target.value] }))}
            >
              {GENRE_OPTIONS.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Type
            <select
              value={entry.mediaType}
              onChange={(e) => setEntry((v) => ({ ...v, mediaType: e.target.value }))}
            >
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type.replace("-", " ").replace(/\b\w/g, (m) => m.toUpperCase())}
                </option>
              ))}
            </select>
          </label>

          <label className="full">
            Poster Image URL (auto-filled if you use lookup)
            <input
              value={entry.coverUrl}
              onChange={(e) => setEntry((v) => ({ ...v, coverUrl: e.target.value }))}
              placeholder="https://... or leave blank"
            />
          </label>

          <div className="score-panel full">
            <div className="score-panel-top">
              <div>
                <div className="score-panel-label">How was it?</div>
                <div className="score-panel-value" style={{ color: scoreColor(entry.familyScore) }}>
                  {entry.familyScore}
                </div>
              </div>
              <div className="score-panel-flavor">{flavorText(Number(entry.familyScore || 0))}</div>
            </div>
            <input
              className="score-slider"
              type="range"
              min="0"
              max="100"
              value={entry.familyScore}
              onChange={(e) => setEntry((v) => ({ ...v, familyScore: Number(e.target.value) }))}
            />
            <div className="score-panel-scale">
              <span>0 - Trash fire 🗑️</span>
              <span>50</span>
              <span>100 - Masterpiece 🏆</span>
            </div>
          </div>

          <label className="full">
            Notes / Pitch
            <textarea
              rows="4"
              value={entry.review}
              onChange={(e) => setEntry((v) => ({ ...v, review: e.target.value }))}
              placeholder="Why should the family watch this? Or suffer?"
            />
          </label>

          <label>
            Your Name *
            <input
              value={entry.authorName || ""}
              onChange={(e) => setEntry((v) => ({ ...v, authorName: e.target.value }))}
              placeholder="Display name"
              required
            />
          </label>

          <label>
            Emoji (fallback poster)
            <input
              value={entry.emoji || ""}
              onChange={(e) => setEntry((v) => ({ ...v, emoji: e.target.value }))}
              placeholder="🎬"
            />
          </label>

          <label className="full pin-panel">
            <span>Your PIN * {entry.id ? "(needed to edit)" : "(needed to edit later)"}</span>
            <input
              type="password"
              value={entry.submitPin || ""}
              onChange={(e) => setEntry((v) => ({ ...v, submitPin: e.target.value }))}
              placeholder="••••"
              autoComplete="off"
              required
            />
            <small>Choose a PIN you&apos;ll remember. Same name + PIN = edit access.</small>
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : entry.id ? "Save Changes" : "Add to Corner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function scoreColor(score) {
  const n = Number(score || 0);
  if (n >= 80) return "#6fe3a1";
  if (n >= 50) return "#f5bf67";
  return "#f36363";
}
