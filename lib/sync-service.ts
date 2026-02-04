/**
 * Sync Service - Pulls 13F data from SEC EDGAR and stores in database
 */

import prisma from './db';
import { get13FFilings, get13FInfoTableXml } from './edgar/client';
import { parse13FXml, normalizeCusip } from './edgar/parser';
import { findCIK } from './edgar/cik-mapper';
import fundMappings from '../data/fund_mappings.json';

const manualMappings = fundMappings.mappings as Record<string, string>;

interface SyncProgress {
  total: number;
  completed: number;
  current?: string;
  errors: string[];
}

type ProgressCallback = (progress: SyncProgress) => void;

/**
 * Find CIK for a fund name, checking manual mappings first
 */
async function resolveCIK(fundName: string): Promise<string | null> {
  // Check manual mappings first
  const upperName = fundName.toUpperCase().trim();
  for (const [key, cik] of Object.entries(manualMappings)) {
    if (upperName.includes(key) || key.includes(upperName)) {
      return cik;
    }
  }

  // Fall back to fuzzy search
  const matches = await findCIK(fundName);
  if (matches.length > 0 && matches[0].score <= 0.3) {
    return matches[0].cik;
  }

  return null;
}

/**
 * Sync a single fund's 13F filings
 */
async function syncFund(
  fundName: string,
  cik: string,
  maxFilings = 8 // Last 2 years of quarterly filings
): Promise<{ success: boolean; error?: string; filingsAdded: number }> {
  try {
    // Upsert fund
    const fund = await prisma.fund.upsert({
      where: { cik },
      update: { name: fundName },
      create: { name: fundName, cik },
    });

    // Get 13F filings
    const filings = await get13FFilings(cik);
    const recentFilings = filings.slice(0, maxFilings);

    let filingsAdded = 0;

    for (const filingInfo of recentFilings) {
      // Check if we already have this filing
      const existing = await prisma.filing.findUnique({
        where: { accessionNumber: filingInfo.accessionNumber },
      });

      if (existing) continue;

      try {
        // Fetch and parse the 13F info table
        const xml = await get13FInfoTableXml(cik, filingInfo.accessionNumber);
        const parsed = parse13FXml(xml, filingInfo.reportDate);

        // Create filing
        const filing = await prisma.filing.create({
          data: {
            fundId: fund.id,
            accessionNumber: filingInfo.accessionNumber,
            reportDate: new Date(filingInfo.reportDate),
            filedDate: new Date(filingInfo.filingDate),
          },
        });

        // Process holdings
        for (const holding of parsed.holdings) {
          const cusip = normalizeCusip(holding.cusip);

          // Upsert security
          const security = await prisma.security.upsert({
            where: { cusip },
            update: {},
            create: {
              cusip,
              issuerName: holding.issuerName,
            },
          });

          // Create holding
          await prisma.holding.create({
            data: {
              filingId: filing.id,
              securityId: security.id,
              value: holding.value,
              shares: holding.shares,
            },
          });
        }

        filingsAdded++;
      } catch (error) {
        console.error(`Error processing filing ${filingInfo.accessionNumber}:`, error);
        // Continue with other filings
      }
    }

    return { success: true, filingsAdded };
  } catch (error) {
    return { success: false, error: String(error), filingsAdded: 0 };
  }
}

/**
 * Sync all funds from a list
 */
export async function syncFunds(
  funds: { name: string; cik?: string }[],
  onProgress?: ProgressCallback
): Promise<{ success: number; failed: number; errors: string[] }> {
  const progress: SyncProgress = {
    total: funds.length,
    completed: 0,
    errors: [],
  };

  // Create sync log entry
  const syncLog = await prisma.syncLog.create({
    data: {
      status: 'started',
      message: `Starting sync for ${funds.length} funds`,
    },
  });

  let success = 0;
  let failed = 0;

  for (const fund of funds) {
    progress.current = fund.name;
    onProgress?.(progress);

    // Resolve CIK if not provided
    let cik = fund.cik;
    if (!cik) {
      cik = await resolveCIK(fund.name) ?? undefined;
    }

    if (!cik) {
      progress.errors.push(`Could not find CIK for: ${fund.name}`);
      failed++;
      progress.completed++;
      continue;
    }

    const result = await syncFund(fund.name, cik);

    if (result.success) {
      success++;
    } else {
      failed++;
      progress.errors.push(`${fund.name}: ${result.error}`);
    }

    progress.completed++;
    onProgress?.(progress);
  }

  // Update sync log
  await prisma.syncLog.update({
    where: { id: syncLog.id },
    data: {
      status: 'completed',
      message: `Synced ${success} funds, ${failed} failed`,
      fundsProcessed: success,
    },
  });

  return { success, failed, errors: progress.errors };
}

/**
 * Sync a single fund by name
 */
export async function syncSingleFund(
  fundName: string,
  cik?: string
): Promise<{ success: boolean; error?: string }> {
  const resolvedCik = cik || await resolveCIK(fundName);

  if (!resolvedCik) {
    return { success: false, error: 'Could not find CIK' };
  }

  const result = await syncFund(fundName, resolvedCik);
  return { success: result.success, error: result.error };
}
