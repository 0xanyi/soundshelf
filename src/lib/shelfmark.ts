/**
 * Shelfmark: the short classification code a Playlist is filed under.
 *
 * SoundShelf stores no artwork, so a Playlist has nothing to be recognised by
 * except its title. The shelfmark gives it a second handle — short, fixed
 * width, and stable for the life of the record — the way an archive gives a
 * holding a code that identifies it independently of what it is called.
 *
 * Derived from the id rather than stored, so it survives renames and needs no
 * migration. Base 32 without vowels or look-alike digits, so a code can be
 * read aloud and typed back without ambiguity.
 */

const ALPHABET = "0123456789BCDFGHJKLMNPQRSTVWXYZ";
const CODE_LENGTH = 3;

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The bare code, e.g. `4KQ`. */
export function getShelfmarkCode(id: string | null | undefined): string {
  if (!id) {
    return "—".repeat(CODE_LENGTH);
  }

  let value = hash(id);
  let code = "";

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code = ALPHABET[value % ALPHABET.length] + code;
    value = Math.floor(value / ALPHABET.length);
  }

  return code;
}

/** The code as it is filed and displayed, e.g. `SS·4KQ`. */
export function getShelfmark(id: string | null | undefined): string {
  return `SS·${getShelfmarkCode(id)}`;
}
