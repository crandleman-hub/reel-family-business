# Google Sheets Schema (Reel Family Business)

Create a Google Sheet with these tabs:

## `Entries` tab columns (row 1)

`id | status | title | mediaType | year | genres | familyScore | ageGuidance | ratingLabel | review | pros | cons | authorName | emoji | coverUrl | sourceLookupId | sourceLookupProvider | ownerPinHash | createdAt | updatedAt`

## `Pins` tab columns (row 1)

`pinLabel | pinHash | status | canView | canSubmit | canEdit | canDelete`

## `Settings` tab (optional)

Optional if you use Script Properties instead. Script Properties is recommended for keys.

Fields to store in Script Properties:

- `OMDB_API_KEY` = `bd507ffb`
- `GOOGLE_BOOKS_API_KEY` = your Google Books API key (optional but recommended)
- `FALLBACK_COVER_URL` = public URL to your "Cover Art Not Found" image

## Example PIN row

Use the Apps Script helper function instead of manually hashing:

`addPin_("Family Admin", "1234")`

This writes a hashed PIN and enables all permissions.
