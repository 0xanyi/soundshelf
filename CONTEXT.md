# SoundShelf

Public listening and admin curation of audio Playlists. Admins upload Tunes, put them on Playlists, and set Visibility. Listeners play public Playlists.

## Language

**Tune**:
An uploaded audio file and its display metadata. The thing you hear; not a row on a Playlist.
_Avoid_: track (public playback view), song, file

**Playlist**:
An ordered collection of Tunes with a Visibility. Empty Playlists stay hidden from listeners even if Visibility is public.
_Avoid_: album, queue, mix

**PlaylistItem**:
One row of Playlist membership: a Tune on a Playlist at a Position. A Tune appears at most once on a given Playlist.
_Avoid_: track, entry, song

**Playlist membership**:
Which Tunes belong to which Playlists, and in what Position. The operations that place a Tune on a Playlist, move it, or take it off.
_Avoid_: playlist items helper, order utils

**Position**:
The playback order of a PlaylistItem on its Playlist. Zero-based and contiguous after every membership change.
_Avoid_: index, rank, order

**Visibility**:
Whether a Playlist is `hidden` or `public`. Public Playlists are listed and playable only when they have at least one PlaylistItem. A hidden Playlist id and an unknown id are the same to a listener.
_Avoid_: draft, published, status

**Track**:
The listener-facing view of a PlaylistItem: title, duration, and a playable audio URL. Storage keys stay off this surface.
_Avoid_: Tune (the stored file), PlaylistItem (the membership row)
