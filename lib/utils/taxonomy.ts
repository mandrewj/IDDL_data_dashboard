// Cleans a scientific name string by stripping author/year and trailing whitespace.
// Examples:
//   "Carabus coriaceus Linnaeus, 1758" -> "Carabus coriaceus"
//   "Apis mellifera L." -> "Apis mellifera"
//   "Carabus" -> "Carabus"
export function cleanScientificName(raw: string | undefined | null): string {
  if (!raw) return '';
  let s = String(raw).trim();
  // Strip subgenus parens like "Carabus (Carabus) coriaceus"
  s = s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  // Take leading tokens that look like binomial (Capitalized word + lowercase word)
  const parts = s.split(' ');
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i === 0) {
      // genus must start uppercase
      if (/^[A-Z][a-zA-Z\-]+$/.test(p)) {
        out.push(p);
      } else {
        return s;
      }
    } else if (i === 1) {
      // specific epithet — fully lowercase
      if (/^[a-z\-]+$/.test(p)) {
        out.push(p);
      } else {
        break;
      }
    } else if (i === 2) {
      // optional infraspecific marker, then trinomial
      if (/^(subsp\.|var\.|f\.)$/.test(p) && parts[i + 1] && /^[a-z\-]+$/.test(parts[i + 1])) {
        out.push(p, parts[i + 1]);
        i++;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return out.length ? out.join(' ') : s;
}

export function slugify(input: string | undefined | null): string {
  if (!input) return '';
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function unslugifyTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// For species slugs we preserve the binomial structure: "carabus-coriaceus" <-> "Carabus coriaceus"
export function speciesSlug(scientificName: string): string {
  return slugify(cleanScientificName(scientificName));
}

export function speciesFromSlug(slug: string): string {
  const parts = slug.split('-').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase() + parts[0].slice(1);
  return (
    parts[0][0].toUpperCase() +
    parts[0].slice(1) +
    ' ' +
    parts.slice(1).join(' ')
  );
}

// Rank specificity: lower index = more specific. Used when consolidating multiple
// records under the same scientificName to surface the most-specific known rank.
const RANK_SPECIFICITY = [
  'subspecies',
  'variety',
  'form',
  'species',
  'subgenus',
  'genus',
  'subtribe',
  'tribe',
  'subfamily',
  'family',
  'superfamily',
  'infraorder',
  'suborder',
  'order',
  'superorder',
  'subclass',
  'class',
  'phylum',
  'kingdom',
];

export function moreSpecificRank(a: string | undefined, b: string | undefined): string {
  const ai = RANK_SPECIFICITY.indexOf((a || '').toLowerCase());
  const bi = RANK_SPECIFICITY.indexOf((b || '').toLowerCase());
  if (ai === -1 && bi === -1) return a || b || 'unknown';
  if (ai === -1) return b!;
  if (bi === -1) return a!;
  return ai < bi ? a! : b!;
}

// Detects whether a single-token scientific name looks like a family
// (insect families end in -idae) or superfamily (-oidea) by Linnaean convention.
export function suffixRank(name: string): 'family' | 'superfamily' | 'subfamily' | 'tribe' | 'subtribe' | undefined {
  if (!name || name.includes(' ')) return undefined;
  if (/idae$/i.test(name)) return 'family';
  if (/oidea$/i.test(name)) return 'superfamily';
  if (/inae$/i.test(name)) return 'subfamily';
  if (/ini$/i.test(name)) return 'tribe';
  if (/ina$/i.test(name)) return 'subtribe';
  return undefined;
}
