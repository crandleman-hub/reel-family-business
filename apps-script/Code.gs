/**
 * Reel Family Business - Google Apps Script backend
 *
 * Sheet tabs required:
 * - Entries
 * - Pins
 * - Settings (optional, can also use Script Properties)
 *
 * Deploy as Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 */

const ENTRY_HEADERS = [
  "id",
  "status",
  "title",
  "mediaType",
  "year",
  "genres",
  "familyScore",
  "ageGuidance",
  "ratingLabel",
  "review",
  "pros",
  "cons",
  "authorName",
  "emoji",
  "coverUrl",
  "sourceLookupId",
  "sourceLookupProvider",
  "ownerPinHash",
  "createdAt",
  "updatedAt"
];

const PIN_HEADERS = ["pinLabel", "pinHash", "status", "canView", "canSubmit", "canEdit", "canDelete"];
const FAMILY_MEMBER_NAMES = [
  "Chris",
  "Alycia",
  "Jojo",
  "Liza",
  "Jeff",
  "Elias",
  "Ward",
  "Pat",
  "Mike",
  "Jaunice",
  "Josh",
  "Cassandra",
  "Kona",
  "Walela"
];

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "health";
  if (action === "health") {
    return jsonOut({ ok: true, app: "reel-family-business", timestamp: new Date().toISOString() });
  }
  return jsonOut({ ok: false, error: "Use POST for API actions" });
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = body.action;

    switch (action) {
      case "validatePin":
        return jsonOut(validatePin_(body.pin));
      case "listEntries":
        return jsonOut({ ok: true, entries: readEntries_(body.pin) });
      case "lookupMedia":
        return jsonOut(lookupMedia_(body.query, body.mediaType));
      case "upsertEntry":
        return jsonOut(upsertEntry_(body.pin, body.entry));
      case "deleteEntry":
        return jsonOut(deleteEntry_(body.pin, body.id));
      default:
        return jsonOut({ ok: false, error: "Unknown action" });
    }
  } catch (err) {
    return jsonOut({ ok: false, error: err.message || String(err) });
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function jsonOut(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Missing sheet tab: " + name);
  return sheet;
}

function ensureHeaders_() {
  const entries = getSheet_("Entries");
  const pins = getSheet_("Pins");
  ensureHeaderRow_(entries, ENTRY_HEADERS);
  ensureHeaderRow_(pins, PIN_HEADERS);
}

function ensureHeaderRow_(sheet, headers) {
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const missing = headers.some(function (header, index) {
    return firstRow[index] !== header;
  });
  if (missing) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function setupSheets() {
  ensureHeaders_();
  return "Headers ensured for Entries and Pins.";
}

function sha256_(value) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return raw
    .map(function (b) {
      const v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? "0" + v : v;
    })
    .join("");
}

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    omdbApiKey: props.getProperty("OMDB_API_KEY") || "bd507ffb",
    googleBooksApiKey: props.getProperty("GOOGLE_BOOKS_API_KEY") || "",
    fallbackCoverUrl: props.getProperty("FALLBACK_COVER_URL") || ""
  };
}

function validatePin_(pin) {
  ensureHeaders_();
  const cleanPin = String(pin || "").trim();
  if (!cleanPin) return { ok: false, error: "PIN required" };

  const pinHash = sha256_(cleanPin);
  const pins = readPins_();
  const match = pins.find(function (row) {
    return row.pinHash === pinHash && String(row.status || "").toUpperCase() !== "DISABLED";
  });
  if (!match) return { ok: false, error: "Invalid PIN" };
  if (!truthy_(match.canView)) return { ok: false, error: "PIN does not have view access" };
  return { ok: true, pinLabel: match.pinLabel || "Family PIN", permissions: match };
}

function readPins_() {
  return readRows_("Pins", PIN_HEADERS);
}

function readEntries_(pin) {
  const rows = readRows_("Entries", ENTRY_HEADERS);
  var ownerHash = "";
  if (String(pin || "").trim()) {
    ownerHash = sha256_(String(pin).trim());
  }
  return rows
    .filter(function (row) {
      return String(row.status || "active").toLowerCase() !== "deleted";
    })
    .map(function (row) {
      return {
        id: row.id,
        status: row.status || "active",
        title: row.title,
        mediaType: row.mediaType,
        year: row.year,
        genres: splitGenres_(row.genres),
        familyScore: Number(row.familyScore || 0),
        ageGuidance: Number(row.ageGuidance || 0),
        ratingLabel: row.ratingLabel,
        review: row.review,
        pros: row.pros,
        cons: row.cons,
        authorName: row.authorName,
        emoji: row.emoji,
        coverUrl: row.coverUrl,
        sourceLookupId: row.sourceLookupId,
        sourceLookupProvider: row.sourceLookupProvider,
        isOwner: ownerHash ? row.ownerPinHash === ownerHash : false,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    });
}

function readRows_(sheetName, headers) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function (row) {
    const obj = {};
    headers.forEach(function (header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
}

function lookupMedia_(query, mediaType) {
  const q = String(query || "").trim();
  const kind = String(mediaType || "movie").toLowerCase();
  if (!q) return { ok: false, error: "Query required" };

  if (kind === "book") {
    return lookupBooks_(q);
  }
  return lookupOmdb_(q, kind);
}

function lookupOmdb_(query, mediaType) {
  const config = getConfig_();
  const type = mediaType === "series" ? "series" : "movie";
  const url =
    "https://www.omdbapi.com/?apikey=" +
    encodeURIComponent(config.omdbApiKey) +
    "&s=" +
    encodeURIComponent(query) +
    "&type=" +
    encodeURIComponent(type);

  const searchRes = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const searchJson = JSON.parse(searchRes.getContentText());
  if (searchJson.Response === "False") {
    return { ok: true, results: [] };
  }

  const results = (searchJson.Search || []).slice(0, 5).map(function (item) {
    const poster = item.Poster && item.Poster !== "N/A" ? item.Poster : "";
    return {
      title: item.Title || "",
      year: item.Year || "",
      mediaType: type,
      coverUrl: poster,
      genres: [],
      ratingLabel: "",
      sourceLookupProvider: "omdb",
      sourceLookupId: item.imdbID || ""
    };
  });

  results.forEach(function (result, idx) {
    if (!result.sourceLookupId) return;
    try {
      const detailUrl =
        "https://www.omdbapi.com/?apikey=" +
        encodeURIComponent(config.omdbApiKey) +
        "&i=" +
        encodeURIComponent(result.sourceLookupId);
      const detailRes = UrlFetchApp.fetch(detailUrl, { muteHttpExceptions: true });
      const detail = JSON.parse(detailRes.getContentText());
      if (detail && detail.Response !== "False") {
        results[idx].genres = splitGenres_(detail.Genre || "");
        results[idx].ratingLabel = detail.Rated || "";
        results[idx].coverUrl = detail.Poster && detail.Poster !== "N/A" ? detail.Poster : result.coverUrl;
      }
    } catch (err) {}
  });

  return { ok: true, results: results };
}

function lookupBooks_(query) {
  const config = getConfig_();
  let url = "https://www.googleapis.com/books/v1/volumes?q=" + encodeURIComponent(query) + "&maxResults=5";
  if (config.googleBooksApiKey) {
    url += "&key=" + encodeURIComponent(config.googleBooksApiKey);
  }
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const json = JSON.parse(res.getContentText());
  const results = (json.items || []).map(function (item) {
    const info = item.volumeInfo || {};
    const imageLinks = info.imageLinks || {};
    return {
      title: info.title || "",
      year: info.publishedDate ? String(info.publishedDate).slice(0, 4) : "",
      mediaType: "book",
      coverUrl: imageLinks.thumbnail || imageLinks.smallThumbnail || "",
      genres: info.categories || [],
      ratingLabel: "Book",
      sourceLookupProvider: "googleBooks",
      sourceLookupId: item.id || ""
    };
  });
  return { ok: true, results: results };
}

function upsertEntry_(pin, entry) {
  ensureHeaders_();
  const pinCheck = validatePin_(pin);
  if (!pinCheck.ok) return pinCheck;
  if (!truthy_(pinCheck.permissions.canSubmit)) return { ok: false, error: "PIN cannot submit" };

  const cleanEntry = sanitizeEntry_(entry || {});
  if (!cleanEntry.title) return { ok: false, error: "Title is required" };

  const pins = readPins_();
  const ownerHash = sha256_(String(pin).trim());
  const now = new Date().toISOString();
  const sheet = getSheet_("Entries");
  const rows = readRows_("Entries", ENTRY_HEADERS);

  if (cleanEntry.id) {
    const idx = rows.findIndex(function (row) {
      return String(row.id) === String(cleanEntry.id);
    });
    if (idx === -1) return { ok: false, error: "Entry not found" };
    const row = rows[idx];
    if (row.ownerPinHash !== ownerHash) return { ok: false, error: "PIN does not own this entry" };
    if (!truthy_(pinCheck.permissions.canEdit)) return { ok: false, error: "PIN cannot edit" };

    const updated = rowFromEntry_(Object.assign({}, cleanEntry, { updatedAt: now, ownerPinHash: ownerHash }), row.createdAt || now);
    sheet.getRange(idx + 2, 1, 1, ENTRY_HEADERS.length).setValues([updated]);
    return { ok: true, entry: cleanEntry };
  }

  const newId = Utilities.getUuid();
  const newRow = rowFromEntry_(
    Object.assign({}, cleanEntry, {
      id: newId,
      status: "active",
      ownerPinHash: ownerHash,
      createdAt: now,
      updatedAt: now
    }),
    now
  );
  sheet.appendRow(newRow);
  return { ok: true, entry: Object.assign({}, cleanEntry, { id: newId, createdAt: now, updatedAt: now }) };
}

function deleteEntry_(pin, id) {
  ensureHeaders_();
  const pinCheck = validatePin_(pin);
  if (!pinCheck.ok) return pinCheck;
  if (!truthy_(pinCheck.permissions.canDelete)) return { ok: false, error: "PIN cannot delete" };

  const ownerHash = sha256_(String(pin).trim());
  const rows = readRows_("Entries", ENTRY_HEADERS);
  const idx = rows.findIndex(function (row) {
    return String(row.id) === String(id);
  });
  if (idx === -1) return { ok: false, error: "Entry not found" };
  if (rows[idx].ownerPinHash !== ownerHash) return { ok: false, error: "PIN does not own this entry" };

  const sheet = getSheet_("Entries");
  sheet.getRange(idx + 2, ENTRY_HEADERS.indexOf("status") + 1).setValue("deleted");
  sheet.getRange(idx + 2, ENTRY_HEADERS.indexOf("updatedAt") + 1).setValue(new Date().toISOString());
  return { ok: true, deleted: true };
}

function sanitizeEntry_(entry) {
  return {
    id: String(entry.id || "").trim(),
    status: String(entry.status || "active").trim(),
    title: String(entry.title || "").trim(),
    mediaType: String(entry.mediaType || "movie").trim().toLowerCase(),
    year: String(entry.year || "").trim(),
    genres: Array.isArray(entry.genres) ? entry.genres : splitGenres_(entry.genres || ""),
    familyScore: clampNum_(entry.familyScore, 0, 100, 50),
    ageGuidance: clampNum_(entry.ageGuidance, 0, 21, 10),
    ratingLabel: String(entry.ratingLabel || "").trim(),
    review: String(entry.review || "").trim(),
    pros: String(entry.pros || "").trim(),
    cons: String(entry.cons || "").trim(),
    authorName: String(entry.authorName || "").trim(),
    emoji: String(entry.emoji || "").trim(),
    coverUrl: String(entry.coverUrl || "").trim(),
    sourceLookupId: String(entry.sourceLookupId || "").trim(),
    sourceLookupProvider: String(entry.sourceLookupProvider || "").trim(),
    createdAt: String(entry.createdAt || "").trim(),
    updatedAt: String(entry.updatedAt || "").trim()
  };
}

function rowFromEntry_(entry, createdAtFallback) {
  const rowObj = {
    id: entry.id,
    status: entry.status || "active",
    title: entry.title,
    mediaType: entry.mediaType,
    year: entry.year,
    genres: (entry.genres || []).join(", "),
    familyScore: entry.familyScore,
    ageGuidance: entry.ageGuidance,
    ratingLabel: entry.ratingLabel,
    review: entry.review,
    pros: entry.pros,
    cons: entry.cons,
    authorName: entry.authorName,
    emoji: entry.emoji,
    coverUrl: entry.coverUrl || getConfig_().fallbackCoverUrl || "",
    sourceLookupId: entry.sourceLookupId,
    sourceLookupProvider: entry.sourceLookupProvider,
    ownerPinHash: entry.ownerPinHash,
    createdAt: entry.createdAt || createdAtFallback || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString()
  };
  return ENTRY_HEADERS.map(function (header) {
    return rowObj[header];
  });
}

function splitGenres_(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(",")
    .map(function (g) {
      return g.trim();
    })
    .filter(Boolean);
}

function truthy_(value) {
  return ["true", "1", "yes", "y"].indexOf(String(value || "").toLowerCase()) !== -1;
}

function clampNum_(value, min, max, fallback) {
  const n = Number(value);
  if (isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Utility to add a new PIN from Apps Script editor:
 * addPin_("My Family", "1234");
 */
function addPin_(label, rawPin) {
  ensureHeaders_();
  const sheet = getSheet_("Pins");
  const pinHash = sha256_(String(rawPin || "").trim());
  sheet.appendRow([String(label || "Family PIN"), pinHash, "ACTIVE", true, true, true, true]);
  return "PIN added";
}

/**
 * Helper you can run from the Apps Script dropdown (no arguments needed).
 * Change the PIN below before running.
 */
function createFirstPin() {
  addPin_("Family Admin", "1234");
}

/**
 * Bulk-load family member pin rows.
 * Edit the PIN values first, then run this once.
 */
function createFamilyPins() {
  var pinMap = {
    Chris: "1111",
    Alycia: "2222",
    Jojo: "3333",
    Liza: "4444",
    Jeff: "5555",
    Elias: "6666",
    Ward: "7777",
    Pat: "8888",
    Mike: "9999",
    Jaunice: "1212",
    Josh: "1313",
    Cassandra: "1414",
    Kona: "1515",
    Walela: "1616"
  };

  var existing = readPins_();
  var existingLabels = {};
  existing.forEach(function (row) {
    existingLabels[String(row.pinLabel || "").trim().toLowerCase()] = true;
  });

  var created = [];
  FAMILY_MEMBER_NAMES.forEach(function (name) {
    var labelKey = name.toLowerCase();
    if (existingLabels[labelKey]) return;
    var pin = String(pinMap[name] || "").trim();
    if (!pin) return;
    addPin_(name, pin);
    created.push(name);
  });

  return created.length
    ? "Created pins for: " + created.join(", ")
    : "No new pins created (names may already exist).";
}
