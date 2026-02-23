export default function FilterBar({
  filters,
  setFilters,
  genres,
  onAddClick,
  onRefresh,
  isUnlocked
}) {
  return (
    <section className="filter-panel">
      <div className="filter-grid kcc-style">
        <input
          className="search-input"
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          placeholder="Search title, person..."
        />
        <select
          value={filters.genre}
          onChange={(e) => setFilters((f) => ({ ...f, genre: e.target.value }))}
        >
          <option value="">All Genres</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
        <select
          value={filters.mediaType}
          onChange={(e) => setFilters((f) => ({ ...f, mediaType: e.target.value }))}
        >
          <option value="">All Types</option>
          <option value="movie">Movies</option>
          <option value="series">Shows</option>
          <option value="mini-series">Mini-Series</option>
          <option value="documentary">Documentary</option>
          <option value="book">Books</option>
          <option value="short-film">Short Film</option>
          <option value="other">Other</option>
        </select>
        <select
          value={filters.sort}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
        >
          <option value="score-desc">Score ↓</option>
          <option value="score-asc">Score ↑</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="title-asc">A-Z</option>
          <option value="title-desc">Z-A</option>
        </select>
      </div>

      <div className="filter-lower">
        <div className="filter-range-row compact">
          <label htmlFor="scoreMin">Min Score: {filters.scoreMin}</label>
          <input
            id="scoreMin"
            type="range"
            min="0"
            max="100"
            value={filters.scoreMin}
            onChange={(e) =>
              setFilters((f) => ({ ...f, scoreMin: Number(e.target.value) }))
            }
          />
        </div>

        <label className="my-entries-toggle">
          <input
            type="checkbox"
            checked={filters.myEntriesOnly}
            disabled={!isUnlocked}
            onChange={(e) =>
              setFilters((f) => ({ ...f, myEntriesOnly: e.target.checked }))
            }
          />
          <span>My Entries Only</span>
        </label>
      </div>

      <div className="toolbar-actions">
        <button className="btn-primary" onClick={onAddClick}>
          + Add Entry
        </button>
        <button className="btn-secondary" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </section>
  );
}
