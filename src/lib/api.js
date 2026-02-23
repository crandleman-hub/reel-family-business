import { mockEntries, mockPins } from "./mockData";
import { normalizePin, uid } from "./utils";

const API_MODE = import.meta.env.VITE_API_MODE || "mock";
const PROXY_PATH = import.meta.env.VITE_APPS_SCRIPT_PROXY_PATH || "/api/rfb";
const DIRECT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";

let localEntries = [...mockEntries];

function getEndpoint() {
  if (API_MODE === "direct" && DIRECT_URL) return DIRECT_URL;
  return PROXY_PATH;
}

async function postJson(payload) {
  if (API_MODE === "mock") {
    return handleMock(payload);
  }

  const endpoint = getEndpoint();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }

  return res.json();
}

function matchesPin(pin) {
  return mockPins.includes(normalizePin(pin));
}

function handleMock(payload) {
  const pin = normalizePin(payload.pin);
  const action = payload.action;

  if (action === "validatePin") {
    const ok = matchesPin(pin);
    return Promise.resolve({ ok, pinLabel: ok ? "Mock PIN" : null });
  }

  if (action === "listEntries") {
    return Promise.resolve({
      ok: true,
      entries: localEntries.map((entry) => ({
        ...entry,
        isOwner: matchesPin(pin) && entry.ownerPinHint === pin
      }))
    });
  }

  if (action === "lookupMedia") {
    const q = payload.query || "";
    return Promise.resolve({
      ok: true,
      results: [
        {
          title: q || "Sample Title",
          year: "2020",
          mediaType: payload.mediaType,
          coverUrl: "",
          genres: ["Drama"],
          ratingLabel: payload.mediaType === "book" ? "Book" : "PG",
          sourceLookupProvider: payload.mediaType === "book" ? "googleBooks" : "omdb",
          sourceLookupId: `mock-${uid()}`
        }
      ]
    });
  }

  if (action === "upsertEntry") {
    if (!matchesPin(pin)) {
      return Promise.resolve({ ok: false, error: "Invalid PIN" });
    }

    const entry = payload.entry || {};
    const now = new Date().toISOString();
    if (entry.id) {
      localEntries = localEntries.map((row) =>
        row.id === entry.id ? { ...row, ...entry, updatedAt: now, ownerPinHint: pin } : row
      );
      return Promise.resolve({ ok: true, entry: localEntries.find((r) => r.id === entry.id) });
    }

    const created = {
      ...entry,
      id: uid(),
      createdAt: now,
      updatedAt: now,
      ownerPinHint: pin
    };
    localEntries = [created, ...localEntries];
    return Promise.resolve({ ok: true, entry: created });
  }

  if (action === "deleteEntry") {
    if (!matchesPin(pin)) {
      return Promise.resolve({ ok: false, error: "Invalid PIN" });
    }
    const before = localEntries.length;
    localEntries = localEntries.filter((r) => r.id !== payload.id);
    return Promise.resolve({ ok: true, deleted: localEntries.length !== before });
  }

  return Promise.resolve({ ok: false, error: `Unknown action: ${action}` });
}

export const api = {
  validatePin(pin) {
    return postJson({ action: "validatePin", pin });
  },
  listEntries(pin) {
    return postJson({ action: "listEntries", pin });
  },
  lookupMedia({ query, mediaType }) {
    return postJson({ action: "lookupMedia", query, mediaType });
  },
  upsertEntry({ pin, entry }) {
    return postJson({ action: "upsertEntry", pin, entry });
  },
  deleteEntry({ pin, id }) {
    return postJson({ action: "deleteEntry", pin, id });
  }
};
