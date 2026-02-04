import { NextRequest, NextResponse } from 'next/server';
import { syncFunds, syncSingleFund } from '@/lib/sync-service';
import { parseFundListExcel, parseFundListCSV } from '@/lib/excel-parser';
import fundMappings from '@/data/fund_mappings.json';

// POST /api/sync - Trigger sync for uploaded fund list or default funds
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let funds: { name: string; cik?: string }[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (file) {
        const buffer = await file.arrayBuffer();

        if (file.name.endsWith('.csv')) {
          const text = new TextDecoder().decode(buffer);
          funds = parseFundListCSV(text);
        } else {
          funds = parseFundListExcel(buffer);
        }
      }
    } else if (contentType.includes('application/json')) {
      // Handle JSON body
      const body = await request.json();

      if (body.funds && Array.isArray(body.funds)) {
        funds = body.funds;
      } else if (body.fundName) {
        // Single fund sync
        const result = await syncSingleFund(body.fundName, body.cik);
        return NextResponse.json(result);
      }
    }

    // If no funds provided, use default mappings
    if (funds.length === 0) {
      funds = Object.entries(fundMappings.mappings).map(([name, cik]) => ({
        name,
        cik,
      }));
    }

    const result = await syncFunds(funds);

    return NextResponse.json({
      ok: true,
      synced: result.success,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/sync - Get sync status
export async function GET() {
  const { prisma } = await import('@/lib/db');

  const latestSync = await prisma.syncLog.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    lastSync: latestSync,
  });
}
