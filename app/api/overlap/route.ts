import { NextRequest, NextResponse } from 'next/server';
import {
  getMostHeldStocks,
  getUniquePicks,
  getFundSimilarities,
  getConsensusBuysSells,
} from '@/lib/analysis/overlap';

// Helper to convert BigInt to string for JSON serialization
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

// GET /api/overlap?type=most-held|unique|similarity|consensus
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'most-held';
  const limit = parseInt(searchParams.get('limit') || '50');
  const minFundCount = parseInt(searchParams.get('minFundCount') || '3');

  try {
    let data;

    switch (type) {
      case 'most-held':
        data = await getMostHeldStocks(limit);
        break;
      case 'unique':
        data = await getUniquePicks(limit);
        break;
      case 'similarity':
        data = await getFundSimilarities();
        break;
      case 'consensus':
        data = await getConsensusBuysSells(minFundCount);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }

    return NextResponse.json(serializeBigInt(data));
  } catch (error) {
    console.error('Overlap API error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
