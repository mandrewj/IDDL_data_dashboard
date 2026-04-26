import { OccurrenceRecord } from '@/lib/types';
import { suffixRank } from '@/lib/utils/taxonomy';

// Fills in missing higher-rank fields when the scientificName itself is a
// higher-rank ID. Two signals are used:
//   1. The Linnaean suffix on the name (e.g. "-idae" → family).
//   2. The taxonRank field, when present and not "species".
// We never overwrite values that the source already provided.
export function enrichTaxonomy(rec: OccurrenceRecord): OccurrenceRecord {
  const sn = rec.scientificName?.trim();
  if (!sn) return rec;

  const rank = (rec.rank || '').toLowerCase();

  // Binomial / trinomial → make sure genus is set from the leading word.
  if (sn.includes(' ')) {
    if (!rec.genus) rec.genus = sn.split(' ')[0];
    if (!rec.specificEpithet) {
      const parts = sn.split(' ');
      if (parts[1] && /^[a-z\-]+$/.test(parts[1])) rec.specificEpithet = parts[1];
    }
    return rec;
  }

  // Single-token name — possibly a family / order / genus / etc.
  const guessed = suffixRank(sn);
  let effectiveRank = rank;

  // The name's suffix is the strongest signal; trust it over a missing/unknown rank.
  if (!effectiveRank || effectiveRank === 'unknown' || effectiveRank === 'no rank') {
    if (guessed) effectiveRank = guessed;
  }

  switch (effectiveRank) {
    case 'family':
      if (!rec.family) rec.family = sn;
      if (rank === '' || rank === 'unknown' || rank === 'no rank') rec.rank = 'family';
      break;
    case 'subfamily':
    case 'tribe':
    case 'subtribe':
      // Below-family ranks: the name itself isn't a family, but if the source
      // didn't supply a family we leave it blank. Just record the rank.
      if (rank === '' || rank === 'unknown' || rank === 'no rank') rec.rank = effectiveRank;
      break;
    case 'superfamily':
      if (rank === '' || rank === 'unknown' || rank === 'no rank') rec.rank = 'superfamily';
      break;
    case 'genus':
    case 'subgenus':
      if (!rec.genus) rec.genus = sn;
      if (rank === '' || rank === 'unknown' || rank === 'no rank') rec.rank = 'genus';
      break;
    case 'order':
    case 'suborder':
    case 'infraorder':
    case 'superorder':
      if (!rec.order) rec.order = sn;
      if (rank === '' || rank === 'unknown' || rank === 'no rank') rec.rank = 'order';
      break;
    default:
      // Untyped single-token name with no suffix match: fall back to suffix-based
      // family inference even if rank says something we don't recognize.
      if (guessed === 'family' && !rec.family) rec.family = sn;
  }

  // Apply suffix-based family inference as a safety net even if the rank told
  // us something else (e.g. rank="no rank" + name "Staphylinidae").
  if (guessed === 'family' && !rec.family) rec.family = sn;

  return rec;
}
