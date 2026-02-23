import { formatDate, mediaLabel, parseGenres, scoreColor } from "../lib/utils";

export default function EntryCard({
  entry,
  canManage,
  onEdit,
  onDelete,
  fallbackCover
}) {
  const genres = parseGenres(entry.genres);
  const score = Number(entry.familyScore || 0);
  const cover = entry.coverUrl || fallbackCover;

  return (
    <article className="entry-card">
      <div className="entry-cover">
        <img
          src={cover}
          alt={`${entry.title} cover`}
          onError={(e) => {
            if (fallbackCover && e.currentTarget.src !== fallbackCover) {
              e.currentTarget.src = fallbackCover;
            }
          }}
        />
        <span className="badge">{mediaLabel(entry.mediaType)}</span>
      </div>
      <div className="entry-body">
        <div className="entry-head">
          <div>
            <h3>{entry.title}</h3>
            <p className="muted">
              {[entry.year, entry.ratingLabel].filter(Boolean).join(" • ")}
            </p>
          </div>
          <div className="score-chip" style={{ borderColor: scoreColor(score) }}>
            {score}
          </div>
        </div>

        <div className="genre-row">
          {genres.length ? genres.map((g) => <span key={g}>{g}</span>) : <span>Unsorted</span>}
        </div>

        <div className="meter-block">
          <div className="meter-label">
            <span>Family Score</span>
            <span>{score}/100</span>
          </div>
          <div className="meter">
            <div
              className="meter-fill"
              style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: scoreColor(score) }}
            />
          </div>
        </div>

        <p className="score-summary" style={{ color: scoreColor(score) }}>
          {score >= 90 ? "Top pick." : score >= 75 ? "Strong family pick." : score >= 50 ? "Mixed reviews." : "Proceed carefully."}
        </p>
        <p className="review-text">{entry.review || "No review text yet."}</p>
        <div className="card-footer-meta">
          <div className="author-badge">
            <span className="author-emoji">{entry.emoji || "🎬"}</span>
            <span>{entry.authorName || "Guest"}</span>
          </div>
          <span className="muted">{formatDate(entry.createdAt)}</span>
          <span className="score-pill" style={{ background: scoreColor(score) }}>
            {score}
          </span>
        </div>

        {entry.pros ? <p className="mini-note"><strong>Good:</strong> {entry.pros}</p> : null}
        {entry.cons ? <p className="mini-note"><strong>Not so good:</strong> {entry.cons}</p> : null}

        {canManage && entry.isOwner ? (
          <div className="card-actions">
            <button className="btn-secondary" onClick={() => onEdit(entry)}>
              Edit
            </button>
            <button className="btn-danger" onClick={() => onDelete(entry)}>
              Delete
            </button>
          </div>
        ) : canManage ? <p className="muted">Unlock owner PIN to edit/delete this entry.</p> : null}
      </div>
    </article>
  );
}
