# Prayer Tunes Web App Design

Date: 2026-04-29

## Goal

Build a simple web app for publishing prayer tune audio playlists. Public users can browse and play published playlists without logging in. Admin users can log in to upload audio files, manage tune metadata, create ordered playlists, and publish or unpublish playlists.

The app will be deployed on Dokploy and will use Cloudflare R2 for uploaded audio storage.

## Recommended Stack

- Framework: Next.js with the App Router
- Database: PostgreSQL
- ORM: Prisma
- Admin authentication: Better Auth
- Audio storage: Cloudflare R2 using the S3-compatible API
- Deployment: Dockerized Next.js app on Dokploy
- Optional client data tools: TanStack Query for admin dashboard list/edit flows

Next.js is the recommended framework because it keeps the public site, admin dashboard, server routes, upload handling, and deployment in one conventional app. R2 should store all uploaded audio files; the application container should not store audio on local disk.

## Product Scope

### Public Player

The public side does not require user accounts. Users can:

- View published playlists.
- Open a playlist.
- Play tunes in the playlist's admin-defined order.
- Pause, resume, seek, skip forward, skip backward, and adjust volume.
- Enable repeat current track.
- Enable repeat playlist.

The public experience should open directly into the player/browse interface rather than a marketing landing page.

### Admin Dashboard

Admins can:

- Log in to a protected dashboard.
- Upload audio files directly from the dashboard.
- Add and edit tune title, description, status, file metadata, and storage metadata.
- Mark tunes as draft or active.
- Create and edit playlists.
- Add tunes to playlists.
- Reorder tunes inside a playlist.
- Publish or unpublish playlists.
- See which tunes are used in playlists.

Deleting a tune that is used by a playlist should not break published playlists. The first version will block deletion while a tune is in use.

## Data Model

### User

Admin users only.

Fields:

- `id`
- `email`
- `name`
- auth provider/session fields
- `createdAt`
- `updatedAt`

### Tune

Represents an uploaded audio file and its display metadata.

Fields:

- `id`
- `title`
- `description`
- `durationSeconds`
- `mimeType`
- `fileSizeBytes`
- `r2ObjectKey`
- `status`: `draft` or `active`
- `createdAt`
- `updatedAt`

### Playlist

Represents a public collection of tunes.

Fields:

- `id`
- `title`
- `description`
- `status`: `draft` or `published`
- `createdAt`
- `updatedAt`

### PlaylistItem

Join table for playlist membership and ordering.

Fields:

- `id`
- `playlistId`
- `tuneId`
- `position`
- `createdAt`
- `updatedAt`

Constraints:

- A playlist item belongs to one playlist and one tune.
- `position` controls playback order.
- A playlist should not expose draft/inactive tunes publicly.

## Upload Flow

1. Admin opens the upload screen.
2. Admin selects an audio file.
3. App validates authentication, file type, and file size.
4. App uploads the file to Cloudflare R2.
5. App stores the tune metadata and R2 object key in PostgreSQL.
6. Admin edits title, description, and status.

Allowed audio types for v1 should include common browser-playable formats such as MP3, WAV, M4A/AAC, and OGG if supported by target browsers. The exact max file size should be configured with an environment variable.

## Playback Flow

1. Public user opens a published playlist.
2. App fetches playlist metadata and ordered active tunes.
3. App requests playable audio URLs for the visible tunes.
4. Player loads the current tune.
5. On track end:
   - If repeat current track is enabled, replay the same tune.
   - Else if there is another tune, advance to it.
   - Else if repeat playlist is enabled, return to the first tune.
   - Else stop playback.

The app should use signed R2 URLs for playback in v1. This keeps the Next.js server out of the audio streaming path and avoids unnecessary bandwidth through the app container.

## Error Handling

Admin upload errors should distinguish:

- unauthenticated admin
- unsupported file type
- file too large
- R2 upload failure
- database write failure

Public playback errors should:

- show a concise load/playback error
- keep the playlist visible
- let users skip to the next tune
- avoid exposing internal storage or server details

Admin mutation errors should preserve entered form data where practical.

## UI Direction

The public UI should feel calm, readable, and focused on listening. It should have:

- a playlist browsing area
- a selected playlist track list
- a persistent audio player
- clear repeat, skip, play/pause, seek, and volume controls

The admin UI should be dense and utilitarian. It should have:

- dashboard navigation
- tunes table/library
- upload form
- playlist table
- playlist editor with reorder controls
- publish/draft status controls

The design should use restrained colors, strong typography, accessible contrast, and predictable controls. The player can be more visually polished than the admin dashboard, but neither surface should rely on decorative effects that make audio management harder.

## Deployment And Configuration

Dokploy should deploy the app as a Dockerized Next.js service.

Required services:

- Next.js application container
- PostgreSQL database
- Cloudflare R2 bucket

Required environment variables:

- `DATABASE_URL`
- R2 account ID or endpoint
- R2 access key ID
- R2 secret access key
- R2 bucket name
- auth secret
- public app URL
- max upload size

Uploaded audio must be treated as external object storage, not local filesystem state.

## Testing Strategy

Unit tests:

- playlist ordering helpers
- playback next-track/repeat logic
- upload validation helpers

Integration tests:

- admin auth protection
- tune create/update flows
- playlist create/update/reorder flows
- public endpoint only returns published playlists and active tunes

End-to-end tests:

- admin logs in, uploads a tune, creates a playlist, publishes it
- public user opens the playlist and starts playback
- repeat mode state changes behave correctly

## Out Of Scope For V1

- Public user accounts
- Listening history
- Favorites
- Payments or subscriptions
- Native mobile apps
- Comments, ratings, or social features
- Complex audio processing or waveform generation
- Multiple admin roles

## Open Implementation Choices

These can be finalized during implementation planning:

- Exact maximum upload size
- Whether signed audio URLs are generated per tune request or per playlist request
- Whether tune duration is read client-side before upload or server-side after upload
