import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Helper to convert BigInt to string for JSON serialization
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

// GET /api/funds/[id] - Get fund details with holdings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fundId = parseInt(id);

  if (isNaN(fundId)) {
    return NextResponse.json({ error: 'Invalid fund ID' }, { status: 400 });
  }

  try {
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: {
        filings: {
          orderBy: { reportDate: 'desc' },
          take: 2, // Get last 2 quarters for comparison
          include: {
            holdings: {
              include: { security: true },
              orderBy: { value: 'desc' },
            },
          },
        },
      },
    });

    if (!fund) {
      return NextResponse.json({ error: 'Fund not found' }, { status: 404 });
    }

    // Calculate quarter-over-quarter changes if we have 2 filings
    let changes: {
      added: typeof fund.filings[0]['holdings'];
      removed: typeof fund.filings[0]['holdings'];
      increased: { holding: typeof fund.filings[0]['holdings'][0]; previousValue: bigint; change: bigint }[];
      decreased: { holding: typeof fund.filings[0]['holdings'][0]; previousValue: bigint; change: bigint }[];
    } | null = null;

    if (fund.filings.length === 2) {
      const [current, previous] = fund.filings;
      const currentSecurityIds = new Set(current.holdings.map((h) => h.securityId));
      const previousSecurityIds = new Set(previous.holdings.map((h) => h.securityId));
      const previousHoldingsMap = new Map(
        previous.holdings.map((h) => [h.securityId, h])
      );

      changes = {
        added: current.holdings.filter((h) => !previousSecurityIds.has(h.securityId)),
        removed: previous.holdings.filter((h) => !currentSecurityIds.has(h.securityId)),
        increased: [],
        decreased: [],
      };

      // Find value changes
      for (const holding of current.holdings) {
        const prevHolding = previousHoldingsMap.get(holding.securityId);
        if (prevHolding) {
          const change = holding.value - prevHolding.value;
          if (change > 0) {
            changes.increased.push({
              holding,
              previousValue: prevHolding.value,
              change,
            });
          } else if (change < 0) {
            changes.decreased.push({
              holding,
              previousValue: prevHolding.value,
              change,
            });
          }
        }
      }

      // Sort by absolute change
      changes.increased.sort((a, b) => Number(b.change - a.change));
      changes.decreased.sort((a, b) => Number(a.change - b.change));
    }

    const result = {
      ...fund,
      currentHoldings: fund.filings[0]?.holdings || [],
      totalValue: fund.filings[0]?.holdings.reduce((sum, h) => sum + h.value, 0n) || 0n,
      changes,
    };

    return NextResponse.json(serializeBigInt(result));
  } catch (error) {
    console.error('Fund detail API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
