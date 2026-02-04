/**
 * Fund Name to CIK Mapping with Fuzzy Matching
 */

import Fuse from 'fuse.js';
import { getCompanyTickers } from './client';

interface CompanyTickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

interface CIKMatch {
  cik: string;
  name: string;
  ticker: string;
  score: number; // 0 = perfect match, higher = worse
}

let tickersCache: Record<string, CompanyTickerEntry> | null = null;
let fuseInstance: Fuse<{ key: string; entry: CompanyTickerEntry }> | null = null;

/**
 * Load and cache SEC company tickers
 */
async function loadTickers(): Promise<Record<string, CompanyTickerEntry>> {
  if (tickersCache) return tickersCache;

  tickersCache = await getCompanyTickers();
  return tickersCache;
}

/**
 * Get or create Fuse instance for fuzzy searching
 */
async function getFuse(): Promise<Fuse<{ key: string; entry: CompanyTickerEntry }>> {
  if (fuseInstance) return fuseInstance;

  const tickers = await loadTickers();

  // Create searchable array
  const searchableData = Object.entries(tickers).map(([key, entry]) => ({
    key,
    entry,
  }));

  fuseInstance = new Fuse(searchableData, {
    keys: ['entry.title', 'entry.ticker'],
    threshold: 0.4, // 0 = exact match, 1 = match anything
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  return fuseInstance;
}

/**
 * Manual CIK overrides for funds with difficult-to-match names
 */
const MANUAL_OVERRIDES: Record<string, string> = {
  // Add manual overrides here as needed
  // 'FUND NAME': '0001234567',
};

/**
 * Find CIK for a fund name
 * @param fundName - The fund name to search for
 * @returns Array of potential matches sorted by relevance
 */
export async function findCIK(fundName: string): Promise<CIKMatch[]> {
  // Check manual overrides first
  const upperName = fundName.toUpperCase().trim();
  if (MANUAL_OVERRIDES[upperName]) {
    return [{
      cik: MANUAL_OVERRIDES[upperName],
      name: fundName,
      ticker: '',
      score: 0,
    }];
  }

  const fuse = await getFuse();
  const results = fuse.search(fundName);

  return results.slice(0, 5).map(result => ({
    cik: result.item.entry.cik_str.toString().padStart(10, '0'),
    name: result.item.entry.title,
    ticker: result.item.entry.ticker,
    score: result.score ?? 1,
  }));
}

/**
 * Get best CIK match for a fund name
 * Returns null if no good match found (score threshold)
 */
export async function getBestCIKMatch(fundName: string, scoreThreshold = 0.3): Promise<CIKMatch | null> {
  const matches = await findCIK(fundName);

  if (matches.length === 0) return null;

  const best = matches[0];
  if (best.score <= scoreThreshold) {
    return best;
  }

  return null;
}

/**
 * Batch find CIKs for multiple fund names
 */
export async function findCIKsForFunds(
  fundNames: string[]
): Promise<Map<string, CIKMatch | null>> {
  const results = new Map<string, CIKMatch | null>();

  for (const name of fundNames) {
    results.set(name, await getBestCIKMatch(name));
  }

  return results;
}
