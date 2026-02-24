# Reel Family Business

A Netlify-hosted family review site for movies, shows, and books with:

- PIN-based access for posting/editing/deleting
- Public browsing
- Google Sheets + Google Apps Script backend
- OMDb (movies/TV) + Google Books API autofill

## Stack

- React + Vite (frontend)
- Netlify (hosting)
- Netlify Function proxy (`/api/rfb`)
- Google Apps Script Web App (backend)
- Google Sheets (database)

## Quick Start (mock mode)

1. Install dependencies: `npm install`
2. Start app: `npm run dev`
3. Use any mock PIN: `1111`, `2468`, or `FAMILY1`

## Switch to live backend

1. Create your Google Sheet and tabs (`Entries`, `Pins`)
2. Paste `/apps-script/Code.gs` into Apps Script attached to that Sheet
3. Run `setupSheets()`
4. Run `createFirstPin()` (edit the PIN in `Code.gs` first)
5. Optional bulk load: run `createFamilyPins()` after replacing the placeholder PINs in the `pinMap`
6. Set Script Properties:
   - `OMDB_API_KEY=bd507ffb`
   - `GOOGLE_BOOKS_API_KEY=...`
   - `FALLBACK_COVER_URL=https://...`
7. Deploy Apps Script as Web App (Anyone)
8. In Netlify environment variables set:
   - `APPS_SCRIPT_URL=<your web app URL>`
9. In frontend `.env` set:
   - `VITE_API_MODE=proxy`
10. Deploy to Netlify

## Branding assets

Place your files in `/public`:

- `reel-family-business-logo.png` (your provided logo)
- `fallback-cover.png` (your provided cover-not-found image)

## Notes

- The frontend currently allows showing edit/delete buttons whenever a PIN is unlocked. The backend enforces ownership and will reject edits/deletes for entries created with a different PIN.
- OMDb does not support books, so books use Google Books API.
- If you started with an older version of the sheet, re-check `Entries` columns after updating `Code.gs` because `authorName` and `emoji` were added.
