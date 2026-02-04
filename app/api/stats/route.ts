import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/analysis/overlap';

// Helper to convert BigInt to string for JSON serialization
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

// GET /api/stats - Get dashboard statistics
export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(serializeBigInt(stats));
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
