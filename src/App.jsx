import { useEffect, useMemo, useState } from "react";
import FilterBar from "./components/FilterBar";
import EntryCard from "./components/EntryCard";
import EntryFormModal from "./components/EntryFormModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import { api } from "./lib/api";
import { normalizePin, parseGenres } from "./lib/utils";

const FALLBACK_COVER = "/fallback-cover.png";
const LOGO_PATH = "/reel-family-business-logo.png";
const PIN_STORAGE_KEY = "rfb_pin";

export default function App() {
  const [pin, setPin] = useState(localStorage.getItem(PIN_STORAGE_KEY) || "");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authStatus, setAuthStatus] = useState("idle");
  const [authError, setAuthError] = useState("");
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [savingEntry, setSavingEntry] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [filters, setFilters] = useState({
    query: "",
    genre: "",
    mediaType: "",
    sort: "score-desc",
    scoreMin: 0,
    ageMax: 21,
    myEntriesOnly: false
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadEntries(pinOverride) {
    setLoadingEntries(true);
    try {
      const res = await api.listEntries(pinOverride ?? (isUnlocked ? pin : ""));
      if (!res.ok) throw new Error(res.error || "Could not load entries");
      setEntries(res.entries || []);
    } catch (err) {
      setToast(err.message);
    } finally {
      setLoadingEntries(false);
    }
  }

  useEffect(() => {
    loadEntries("");
  }, []);

  async function handleUnlock() {
    setAuthStatus("loading");
    setAuthError("");
    try {
      const cleanPin = normalizePin(pin);
      const res = await api.validatePin(cleanPin);
      if (!res.ok) {
        setIsUnlocked(false);
        setAuthError(res.error || "Invalid PIN");
      } else {
        setIsUnlocked(true);
        localStorage.setItem(PIN_STORAGE_KEY, cleanPin);
        await loadEntries(cleanPin);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthStatus("idle");
    }
  }

  useEffect(() => {
    if (!isUnlocked && filters.myEntriesOnly) {
      setFilters((f) => ({ ...f, myEntriesOnly: false }));
    }
  }, [isUnlocked, filters.myEntriesOnly]);

  const genres = useMemo(() => {
    const set = new Set();
    entries.forEach((entry) => parseGenres(entry.genres).forEach((g) => set.add(g)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const visibleEntries = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const next = entries.filter((entry) => {
      if (filters.mediaType && entry.mediaType !== filters.mediaType) return false;
      if (filters.genre && !parseGenres(entry.genres).includes(filters.genre)) return false;
      if (Number(entry.familyScore || 0) < filters.scoreMin) return false;
      if (Number(entry.ageGuidance || 0) > filters.ageMax) return false;
      if (filters.myEntriesOnly && !entry.isOwner) return false;
      if (!q) return true;
      const haystack = [
        entry.title,
        entry.review,
        entry.pros,
        entry.cons,
        ...(parseGenres(entry.genres) || [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    next.sort((a, b) => {
      switch (filters.sort) {
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "score-desc":
          return Number(b.familyScore || 0) - Number(a.familyScore || 0);
        case "score-asc":
          return Number(a.familyScore || 0) - Number(b.familyScore || 0);
        case "title-asc":
          return String(a.title || "").localeCompare(String(b.title || ""));
        case "title-desc":
          return String(b.title || "").localeCompare(String(a.title || ""));
        case "newest":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return next;
  }, [entries, filters]);

  const avgScore = useMemo(() => {
    if (!visibleEntries.length) return 0;
    return Math.round(
      visibleEntries.reduce((sum, e) => sum + Number(e.familyScore || 0), 0) / visibleEntries.length
    );
  }, [visibleEntries]);

  const topPick = useMemo(() => {
    if (!visibleEntries.length) return "";
    return [...visibleEntries]
      .sort((a, b) => Number(b.familyScore || 0) - Number(a.familyScore || 0))[0]
      ?.title;
  }, [visibleEntries]);

  function openCreateModal() {
    setEditingEntry(null);
    setModalOpen(true);
  }

  function openEditModal(entry) {
    if (!isUnlocked) {
      setToast("Enter a PIN to edit entries.");
      return;
    }
    setEditingEntry(entry);
    setModalOpen(true);
  }

  async function handleSave(entry) {
    setSavingEntry(true);
    try {
      const actionPin = normalizePin(entry.submitPin || pin);
      const payload = { ...entry };
      delete payload.submitPin;
      const res = await api.upsertEntry({ pin: actionPin, entry: payload });
      if (!res.ok) throw new Error(res.error || "Save failed");
      if (actionPin) {
        setPin(actionPin);
        setIsUnlocked(true);
        localStorage.setItem(PIN_STORAGE_KEY, actionPin);
      }
      setToast(entry.id ? "Entry updated" : "Entry added");
      setModalOpen(false);
      setEditingEntry(null);
      await loadEntries(actionPin || pin);
    } catch (err) {
      setToast(err.message);
    } finally {
      setSavingEntry(false);
    }
  }

  function handleDelete(entry) {
    if (!isUnlocked) {
      setToast("Enter a PIN to delete entries.");
      return;
    }
    setDeleteTarget(entry);
  }

  async function confirmDelete(deletePin) {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const cleanPin = normalizePin(deletePin || pin);
      const res = await api.deleteEntry({ pin: cleanPin, id: deleteTarget.id });
      if (!res.ok) throw new Error(res.error || "Delete failed");
      setPin(cleanPin);
      setIsUnlocked(true);
      localStorage.setItem(PIN_STORAGE_KEY, cleanPin);
      setToast("Entry deleted");
      setDeleteTarget(null);
      await loadEntries(cleanPin);
    } catch (err) {
      setToast(err.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="bg-glow" />
      <header className="top-header">
        <div className="brand-row">
          <div className="logo-slot">
            <img
              src={LOGO_PATH}
              alt="Reel Family Business logo"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div>
            <h1>Reel Family Business</h1>
            <p>A place where we can talk about what we're watching and reading.</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn-primary" onClick={openCreateModal}>
            + Add Entry
          </button>
          <button className="btn-secondary" onClick={() => setConfigOpen((v) => !v)}>
            ⚙ Setup / Config
          </button>
        </div>
      </header>

      {configOpen ? (
        <section className="config-panel">
          <p>
            Netlify mode: set <code>VITE_API_MODE=proxy</code> and configure <code>APPS_SCRIPT_URL</code> in
            Netlify env vars. PINs are managed in the Google Sheets <code>Pins</code> tab (hashed by Apps Script helper).
          </p>
          <div className="config-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                localStorage.removeItem(PIN_STORAGE_KEY);
                setPin("");
                setIsUnlocked(false);
                setAuthError("");
                setToast("PIN cleared");
              }}
            >
              Clear Saved PIN
            </button>
            <button className="btn-secondary" onClick={() => setConfigOpen(false)}>
              Close
            </button>
          </div>
        </section>
      ) : null}

      <section className="pin-inline">
        <div className="pin-inline-row">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            autoComplete="off"
          />
          <button onClick={handleUnlock} disabled={authStatus === "loading"}>
            {authStatus === "loading" ? "Checking..." : isUnlocked ? "Re-check PIN" : "Unlock"}
          </button>
        </div>
        <span className={`pin-status ${isUnlocked ? "ok" : ""}`}>
          {isUnlocked ? "PIN active" : "PIN required for submit/edit/delete"}
        </span>
        {authError ? <div className="form-error">{authError}</div> : null}
      </section>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        genres={genres}
        onAddClick={openCreateModal}
        onRefresh={() => loadEntries(isUnlocked ? pin : "")}
        isUnlocked={isUnlocked}
      />

      <section className="stats-row">
        <span>Showing {visibleEntries.length}</span>
        <span>All entries {entries.length}</span>
        <span>Avg score {avgScore}</span>
        <span>Top pick {topPick || "N/A"}</span>
        <span>Unlocked {isUnlocked ? "Yes" : "No"}</span>
        <span>{filters.myEntriesOnly ? "My entries filter on" : "All entries view"}</span>
      </section>

      {loadingEntries ? (
        <div className="loading-state">Loading entries...</div>
      ) : (
        <section className="entry-grid">
          {visibleEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              canManage={isUnlocked}
              onEdit={openEditModal}
              onDelete={handleDelete}
              fallbackCover={FALLBACK_COVER}
            />
          ))}
          {!visibleEntries.length ? (
            <div className="empty-state">
              No matches yet. Try a different filter, or add a new entry.
            </div>
          ) : null}
        </section>
      )}

      <EntryFormModal
        open={modalOpen}
        initialEntry={editingEntry}
        activePin={pin}
        onClose={() => {
          setModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSave}
        onLookup={api.lookupMedia}
        saving={savingEntry}
      />

      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        entryTitle={deleteTarget?.title}
        defaultPin={pin}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
