import JSZip from 'jszip';
import { parse as parseCsv } from 'csv-parse/sync';
import { parseStringPromise } from 'xml2js';
import { OccurrenceRecord } from '@/lib/types';
import { cleanScientificName } from '@/lib/utils/taxonomy';
import { isValidCoord, parseDateParts } from '@/lib/utils/geo';
import { enrichTaxonomy } from './enrichTaxonomy';

interface FieldMapping {
  index: number;
  term: string;
}

interface CoreSpec {
  filename: string;
  rowType: string;
  fieldsTerminatedBy: string;
  linesTerminatedBy: string;
  ignoreHeaderLines: number;
  encoding: string;
  fields: FieldMapping[];
  idIndex?: number;
}

// Strip the "http://rs.tdwg.org/dwc/terms/" or similar prefix and return the local term
function localTerm(uri: string): string {
  if (!uri) return '';
  const slash = uri.lastIndexOf('/');
  const hash = uri.lastIndexOf('#');
  const idx = Math.max(slash, hash);
  return idx >= 0 ? uri.slice(idx + 1) : uri;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function unescapeChar(s: string | undefined, fallback: string): string {
  if (s === undefined) return fallback;
  return s
    .replace(/\\t/g, '\t')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r');
}

async function parseMeta(metaXml: string): Promise<CoreSpec> {
  const parsed = await parseStringPromise(metaXml, {
    explicitArray: false,
    ignoreAttrs: false,
    mergeAttrs: false,
    attrkey: '$',
    charkey: '_',
  });

  const archive = parsed.archive ?? parsed;
  const core = archive.core;
  if (!core) throw new Error('meta.xml has no <core> element');

  const attrs = core.$ ?? {};
  const filesNode = core.files;
  const filename =
    typeof filesNode === 'string'
      ? filesNode
      : filesNode?.location ?? filesNode?.[0]?.location ?? '';
  if (!filename) throw new Error('meta.xml core has no file location');

  const fieldNodes = asArray(core.field);
  const fields: FieldMapping[] = fieldNodes
    .map((f: any) => {
      const a = f.$ ?? {};
      return {
        index: a.index !== undefined ? parseInt(a.index, 10) : NaN,
        term: a.term ?? '',
      };
    })
    .filter((f) => !Number.isNaN(f.index) && f.term);

  let idIndex: number | undefined;
  if (core.id?.$?.index !== undefined) {
    idIndex = parseInt(core.id.$.index, 10);
  }

  return {
    filename,
    rowType: attrs.rowType ?? '',
    fieldsTerminatedBy: unescapeChar(attrs.fieldsTerminatedBy, ','),
    linesTerminatedBy: unescapeChar(attrs.linesTerminatedBy, '\n'),
    ignoreHeaderLines: attrs.ignoreHeaderLines ? parseInt(attrs.ignoreHeaderLines, 10) : 0,
    encoding: attrs.encoding ?? 'UTF-8',
    fields,
    idIndex,
  };
}

function buildIndexLookup(spec: CoreSpec): Record<string, number> {
  const lookup: Record<string, number> = {};
  for (const f of spec.fields) {
    lookup[localTerm(f.term).toLowerCase()] = f.index;
  }
  if (spec.idIndex !== undefined) lookup['_id'] = spec.idIndex;
  return lookup;
}

function pick(row: string[], idx: number | undefined): string | undefined {
  if (idx === undefined) return undefined;
  const v = row[idx];
  if (v === undefined || v === null) return undefined;
  const t = String(v).trim();
  return t.length ? t : undefined;
}

function parseFloatSafe(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function parseDwcaArchive(zipBuffer: ArrayBuffer | Buffer): Promise<OccurrenceRecord[]> {
  const zip = await JSZip.loadAsync(zipBuffer);

  const metaFile = zip.file(/^meta\.xml$/i)[0];
  if (!metaFile) throw new Error('No meta.xml in DwC-A zip');
  const metaXml = await metaFile.async('string');
  const spec = await parseMeta(metaXml);

  const coreFile = zip.file(spec.filename) ?? zip.file(new RegExp(spec.filename, 'i'))[0];
  if (!coreFile) throw new Error(`Core file ${spec.filename} not found in zip`);
  const coreText = await coreFile.async('string');

  const rows = parseCsv(coreText, {
    delimiter: spec.fieldsTerminatedBy,
    from_line: spec.ignoreHeaderLines + 1,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
    trim: false,
    bom: true,
  }) as string[][];

  const idx = buildIndexLookup(spec);
  const get = (row: string[], term: string) => pick(row, idx[term.toLowerCase()]);

  const out: OccurrenceRecord[] = [];
  for (const row of rows) {
    const occurrenceId = get(row, 'occurrenceID') ?? pick(row, idx['_id']) ?? get(row, 'catalogNumber');
    if (!occurrenceId) continue;

    const rawSciName = get(row, 'scientificName') ?? '';
    const cleanedName = cleanScientificName(rawSciName);
    if (!cleanedName) continue;

    const rank = (get(row, 'taxonRank') ?? '').toLowerCase();
    const order = get(row, 'order');
    const family = get(row, 'family');
    const genus = get(row, 'genus');
    const specific = get(row, 'specificEpithet');

    const dateRaw = get(row, 'eventDate') ?? get(row, 'verbatimEventDate');
    const dateParts = parseDateParts(dateRaw);

    const lat = parseFloatSafe(get(row, 'decimalLatitude'));
    const lng = parseFloatSafe(get(row, 'decimalLongitude'));

    const stateProvince = get(row, 'stateProvince');
    const county = get(row, 'county');
    const recordedBy = get(row, 'recordedBy');
    const catalogNumber = get(row, 'catalogNumber');
    const basisOfRecord = get(row, 'basisOfRecord');

    out.push(
      enrichTaxonomy({
        id: `dwca:${occurrenceId}`,
        source: 'dwca',
        scientificName: cleanedName,
        rank: rank || (specific ? 'species' : genus ? 'genus' : family ? 'family' : 'unknown'),
        order,
        family,
        genus,
        specificEpithet: specific,
        date: dateParts.iso,
        year: dateParts.year,
        month: dateParts.month,
        lat: isValidCoord(lat, lng) ? lat : undefined,
        lng: isValidCoord(lat, lng) ? lng : undefined,
        stateProvince,
        county,
        recordedBy,
        catalogNumber,
        basisOfRecord,
      })
    );
  }
  return out;
}
