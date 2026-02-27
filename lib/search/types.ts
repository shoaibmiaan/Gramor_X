// lib/search/types.ts

export type SearchResultType = 'module' | 'course' | 'lesson' | 'vocabulary' | 'resource';

export type SearchResult = {
  id: string;
  title: string;
  description: string;
  href: string;
  type: SearchResultType;
  /** Optional supporting detail shown beneath the description */
  snippet?: string;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
};

export type SearchErrorResponse = {
  error: string;
};

