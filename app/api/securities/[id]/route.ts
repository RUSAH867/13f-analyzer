import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getFundsHoldingSecurity } from '@/lib/analysis/overlap';

// Helper to convert BigInt to string for JSON serialization
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

// GET /api/securities/[id] - Get security details with holding funds
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const securityId = parseInt(id);

  if (isNaN(securityId)) {
    return NextResponse.json({ error: 'Invalid security ID' }, { status: 400 });
  }

  try {
    const security = await prisma.security.findUnique({
      where: { id: securityId },
    });

    if (!security) {
      return NextResponse.json({ error: 'Security not found' }, { status: 404 });
    }

    const holders = await getFundsHoldingSecurity(securityId);

    const totalValue = holders.reduce((sum, h) => sum + h.value, 0n);
    const totalShares = holders.reduce((sum, h) => sum + h.shares, 0n);

    return NextResponse.json(
      serializeBigInt({
        ...security,
        holders,
        fundCount: holders.length,
        totalValue,
        totalShares,
      })
    );
  } catch (error) {
    console.error('Security detail API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
