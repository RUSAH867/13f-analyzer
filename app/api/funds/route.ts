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

// GET /api/funds - List all funds with summary stats
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || '';

  try {
    const funds = await prisma.fund.findMany({
      where: search
        ? {
            name: { contains: search },
          }
        : undefined,
      include: {
        filings: {
          orderBy: { reportDate: 'desc' },
          take: 1,
          include: {
            _count: { select: { holdings: true } },
            holdings: {
              select: { value: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = funds.map((fund) => {
      const latestFiling = fund.filings[0];
      const totalValue = latestFiling
        ? latestFiling.holdings.reduce((sum, h) => sum + h.value, 0n)
        : 0n;

      return {
        id: fund.id,
        name: fund.name,
        cik: fund.cik,
        latestFilingDate: latestFiling?.reportDate,
        holdingsCount: latestFiling?._count.holdings || 0,
        totalValue,
      };
    });

    return NextResponse.json(serializeBigInt(result));
  } catch (error) {
    console.error('Funds API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
