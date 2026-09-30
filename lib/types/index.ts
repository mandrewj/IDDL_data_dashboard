export type SourceTag = 'inat' | 'dwca' | 'both';

export interface OccurrenceRecord {
  id: string;
  source: SourceTag;
  scientificName: string;
  commonName?: string;
  rank: string;
  order?: string;
  family?: string;
  genus?: string;
  specificEpithet?: string;
  date?: string;
  month?: number;
  year?: number;
  lat?: number;
  lng?: number;
  /** iNat only: the public coordinates are randomized (taxon or user geoprivacy). */
  coordinatesObscured?: boolean;
  stateProvince?: string;
  county?: string;
  qualityGrade?: string;
  basisOfRecord?: string;
  recordedBy?: string;
  catalogNumber?: string;
  externalUrl?: string;
}

export interface RecordsApiResponse {
  records: OccurrenceRecord[];
  meta: {
    total: number;
    inatCount: number;
    dwcaCount: number;
    bothCount: number;
    sourceErrors: { inat?: string; dwca?: string };
    fetchedAt: string;
  };
}

export interface RecordFilters {
  source?: 'inat' | 'dwca' | 'all';
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  yearMin?: number;
  yearMax?: number;
  monthMin?: number;
  monthMax?: number;
}
