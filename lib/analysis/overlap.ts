/**
 * Overlap Analysis Queries
 * Analyze holding patterns across hedge funds
 */

import prisma from '../db';

export interface MostHeldStock {
  securityId: number;
  cusip: string;
  issuerName: string;
  ticker: string | null;
  fundCount: number;
  totalValue: bigint;
  totalShares: bigint;
  funds: { id: number; name: string; value: bigint; shares: bigint }[];
}

export interface UniquePick {
  securityId: number;
  cusip: string;
  issuerName: string;
  ticker: string | null;
  fundId: number;
  fundName: string;
  value: bigint;
  shares: bigint;
}

export interface FundSimilarity {
  fund1Id: number;
  fund1Name: string;
  fund2Id: number;
  fund2Name: string;
  sharedSecurities: number;
  totalSecuritiesFund1: number;
  totalSecuritiesFund2: number;
  overlapPercentage: number;
}

export interface ConsensusBuySell {
  securityId: number;
  cusip: string;
  issuerName: string;
  ticker: string | null;
  action: 'buy' | 'sell';
  fundCount: number;
  funds: { id: number; name: string }[];
}

/**
 * Get the most recent filing for each fund
 */
export async function getLatestFilingsForAllFunds() {
  const funds = await prisma.fund.findMany({
    include: {
      filings: {
        orderBy: { reportDate: 'desc' },
        take: 1,
      },
    },
  });

  return funds
    .filter(f => f.filings.length > 0)
    .map(f => ({
      fundId: f.id,
      fundName: f.name,
      filingId: f.filings[0].id,
      reportDate: f.filings[0].reportDate,
    }));
}

/**
 * Get stocks held by the most funds (most popular holdings)
 */
export async function getMostHeldStocks(
  limit = 50
): Promise<MostHeldStock[]> {
  // Get the most recent filing for each fund
  const latestFilings = await getLatestFilingsForAllFunds();
  const filingIds = latestFilings.map(f => f.filingId);

  if (filingIds.length === 0) return [];

  // Get all holdings from the latest filings
  const holdings = await prisma.holding.findMany({
    where: { filingId: { in: filingIds } },
    include: {
      security: true,
      filing: {
        include: { fund: true },
      },
    },
  });

  // Group by security
  const securityMap = new Map<number, {
    security: typeof holdings[0]['security'];
    funds: { id: number; name: string; value: bigint; shares: bigint }[];
    totalValue: bigint;
    totalShares: bigint;
  }>();

  for (const holding of holdings) {
    const existing = securityMap.get(holding.securityId);
    if (existing) {
      existing.funds.push({
        id: holding.filing.fund.id,
        name: holding.filing.fund.name,
        value: holding.value,
        shares: holding.shares,
      });
      existing.totalValue += holding.value;
      existing.totalShares += holding.shares;
    } else {
      securityMap.set(holding.securityId, {
        security: holding.security,
        funds: [{
          id: holding.filing.fund.id,
          name: holding.filing.fund.name,
          value: holding.value,
          shares: holding.shares,
        }],
        totalValue: holding.value,
        totalShares: holding.shares,
      });
    }
  }

  // Convert to array and sort by fund count
  const results: MostHeldStock[] = Array.from(securityMap.values())
    .map(item => ({
      securityId: item.security.id,
      cusip: item.security.cusip,
      issuerName: item.security.issuerName,
      ticker: item.security.ticker,
      fundCount: item.funds.length,
      totalValue: item.totalValue,
      totalShares: item.totalShares,
      funds: item.funds,
    }))
    .sort((a, b) => b.fundCount - a.fundCount)
    .slice(0, limit);

  return results;
}

/**
 * Get stocks held by only one fund (unique picks)
 */
export async function getUniquePicks(limit = 50): Promise<UniquePick[]> {
  const latestFilings = await getLatestFilingsForAllFunds();
  const filingIds = latestFilings.map(f => f.filingId);

  if (filingIds.length === 0) return [];

  // Get all holdings from the latest filings
  const holdings = await prisma.holding.findMany({
    where: { filingId: { in: filingIds } },
    include: {
      security: true,
      filing: {
        include: { fund: true },
      },
    },
  });

  // Group by security
  const securityHolders = new Map<number, typeof holdings>();
  for (const holding of holdings) {
    const existing = securityHolders.get(holding.securityId);
    if (existing) {
      existing.push(holding);
    } else {
      securityHolders.set(holding.securityId, [holding]);
    }
  }

  // Find securities held by only one fund
  const uniquePicks: UniquePick[] = [];
  for (const [, holdingsList] of securityHolders) {
    if (holdingsList.length === 1) {
      const holding = holdingsList[0];
      uniquePicks.push({
        securityId: holding.security.id,
        cusip: holding.security.cusip,
        issuerName: holding.security.issuerName,
        ticker: holding.security.ticker,
        fundId: holding.filing.fund.id,
        fundName: holding.filing.fund.name,
        value: holding.value,
        shares: holding.shares,
      });
    }
  }

  // Sort by value and take top N
  return uniquePicks
    .sort((a, b) => Number(b.value - a.value))
    .slice(0, limit);
}

/**
 * Calculate similarity between funds based on shared holdings
 */
export async function getFundSimilarities(): Promise<FundSimilarity[]> {
  const latestFilings = await getLatestFilingsForAllFunds();
  const filingIds = latestFilings.map(f => f.filingId);

  if (filingIds.length < 2) return [];

  // Get all holdings from the latest filings
  const holdings = await prisma.holding.findMany({
    where: { filingId: { in: filingIds } },
    include: {
      filing: {
        include: { fund: true },
      },
    },
  });

  // Build map of fund -> set of security IDs
  const fundSecurities = new Map<number, Set<number>>();
  const fundNames = new Map<number, string>();

  for (const holding of holdings) {
    const fundId = holding.filing.fund.id;
    fundNames.set(fundId, holding.filing.fund.name);

    const existing = fundSecurities.get(fundId);
    if (existing) {
      existing.add(holding.securityId);
    } else {
      fundSecurities.set(fundId, new Set([holding.securityId]));
    }
  }

  // Calculate pairwise similarities
  const similarities: FundSimilarity[] = [];
  const fundIds = Array.from(fundSecurities.keys());

  for (let i = 0; i < fundIds.length; i++) {
    for (let j = i + 1; j < fundIds.length; j++) {
      const fund1Id = fundIds[i];
      const fund2Id = fundIds[j];
      const securities1 = fundSecurities.get(fund1Id)!;
      const securities2 = fundSecurities.get(fund2Id)!;

      // Count shared securities
      let shared = 0;
      for (const secId of securities1) {
        if (securities2.has(secId)) shared++;
      }

      // Calculate overlap percentage (Jaccard-like)
      const union = new Set([...securities1, ...securities2]).size;
      const overlapPercentage = union > 0 ? (shared / union) * 100 : 0;

      similarities.push({
        fund1Id,
        fund1Name: fundNames.get(fund1Id)!,
        fund2Id,
        fund2Name: fundNames.get(fund2Id)!,
        sharedSecurities: shared,
        totalSecuritiesFund1: securities1.size,
        totalSecuritiesFund2: securities2.size,
        overlapPercentage,
      });
    }
  }

  // Sort by overlap percentage
  return similarities.sort((a, b) => b.overlapPercentage - a.overlapPercentage);
}

/**
 * Find consensus buys/sells - securities added or removed by multiple funds this quarter
 */
export async function getConsensusBuysSells(minFundCount = 3): Promise<ConsensusBuySell[]> {
  // Get the two most recent quarters for each fund
  const funds = await prisma.fund.findMany({
    include: {
      filings: {
        orderBy: { reportDate: 'desc' },
        take: 2,
      },
    },
  });

  const results: ConsensusBuySell[] = [];
  const buyMap = new Map<number, { security: { id: number; cusip: string; issuerName: string; ticker: string | null }; funds: { id: number; name: string }[] }>();
  const sellMap = new Map<number, { security: { id: number; cusip: string; issuerName: string; ticker: string | null }; funds: { id: number; name: string }[] }>();

  for (const fund of funds) {
    if (fund.filings.length < 2) continue;

    const [currentFiling, previousFiling] = fund.filings;

    // Get holdings for both quarters
    const [currentHoldings, previousHoldings] = await Promise.all([
      prisma.holding.findMany({
        where: { filingId: currentFiling.id },
        include: { security: true },
      }),
      prisma.holding.findMany({
        where: { filingId: previousFiling.id },
        include: { security: true },
      }),
    ]);

    const currentSecurityIds = new Set(currentHoldings.map(h => h.securityId));
    const previousSecurityIds = new Set(previousHoldings.map(h => h.securityId));

    // Find new positions (buys)
    for (const holding of currentHoldings) {
      if (!previousSecurityIds.has(holding.securityId)) {
        const existing = buyMap.get(holding.securityId);
        if (existing) {
          existing.funds.push({ id: fund.id, name: fund.name });
        } else {
          buyMap.set(holding.securityId, {
            security: holding.security,
            funds: [{ id: fund.id, name: fund.name }],
          });
        }
      }
    }

    // Find closed positions (sells)
    for (const holding of previousHoldings) {
      if (!currentSecurityIds.has(holding.securityId)) {
        const existing = sellMap.get(holding.securityId);
        if (existing) {
          existing.funds.push({ id: fund.id, name: fund.name });
        } else {
          sellMap.set(holding.securityId, {
            security: holding.security,
            funds: [{ id: fund.id, name: fund.name }],
          });
        }
      }
    }
  }

  // Filter by minimum fund count and convert to results
  for (const [, data] of buyMap) {
    if (data.funds.length >= minFundCount) {
      results.push({
        securityId: data.security.id,
        cusip: data.security.cusip,
        issuerName: data.security.issuerName,
        ticker: data.security.ticker,
        action: 'buy',
        fundCount: data.funds.length,
        funds: data.funds,
      });
    }
  }

  for (const [, data] of sellMap) {
    if (data.funds.length >= minFundCount) {
      results.push({
        securityId: data.security.id,
        cusip: data.security.cusip,
        issuerName: data.security.issuerName,
        ticker: data.security.ticker,
        action: 'sell',
        fundCount: data.funds.length,
        funds: data.funds,
      });
    }
  }

  // Sort by fund count
  return results.sort((a, b) => b.fundCount - a.fundCount);
}

/**
 * Get all funds holding a specific security
 */
export async function getFundsHoldingSecurity(securityId: number) {
  const latestFilings = await getLatestFilingsForAllFunds();
  const filingIds = latestFilings.map(f => f.filingId);

  const holdings = await prisma.holding.findMany({
    where: {
      securityId,
      filingId: { in: filingIds },
    },
    include: {
      filing: {
        include: { fund: true },
      },
    },
  });

  return holdings.map(h => ({
    fundId: h.filing.fund.id,
    fundName: h.filing.fund.name,
    value: h.value,
    shares: h.shares,
    reportDate: h.filing.reportDate,
  }));
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  const [
    totalFunds,
    totalSecurities,
    totalHoldings,
    latestSync,
  ] = await Promise.all([
    prisma.fund.count(),
    prisma.security.count(),
    prisma.holding.count(),
    prisma.syncLog.findFirst({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Get total AUM from latest filings
  const latestFilings = await getLatestFilingsForAllFunds();
  const filingIds = latestFilings.map(f => f.filingId);

  const totalAUM = await prisma.holding.aggregate({
    where: { filingId: { in: filingIds } },
    _sum: { value: true },
  });

  return {
    totalFunds,
    totalSecurities,
    totalHoldings,
    totalAUM: totalAUM._sum.value || 0n,
    lastSyncDate: latestSync?.createdAt,
  };
}
