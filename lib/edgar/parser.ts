/**
 * 13F XML Parser
 * Parses SEC 13F-HR information table XML files
 */

import { XMLParser } from 'fast-xml-parser';

export interface HoldingData {
  cusip: string;
  issuerName: string;
  value: bigint;  // In dollars (normalized from thousands for pre-2023)
  shares: bigint;
  shOrPrnAmt: string; // 'SH' for shares, 'PRN' for principal amount
  investmentDiscretion: string;
  votingAuthority: {
    sole: bigint;
    shared: bigint;
    none: bigint;
  };
}

export interface ParsedFiling {
  holdings: HoldingData[];
  reportDate?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  isArray: (name) => {
    // infoTable may contain multiple infoTable entries
    return name === 'infoTable';
  },
});

/**
 * Parse 13F information table XML
 * @param xml - Raw XML string
 * @param reportDate - Report date to determine value scaling (pre-2023 = thousands)
 */
export function parse13FXml(xml: string, reportDate: string): ParsedFiling {
  const parsed = parser.parse(xml);

  // Handle different possible root structures
  let infoTables: unknown[] = [];

  if (parsed.informationTable?.infoTable) {
    infoTables = Array.isArray(parsed.informationTable.infoTable)
      ? parsed.informationTable.infoTable
      : [parsed.informationTable.infoTable];
  } else if (parsed.infoTable) {
    infoTables = Array.isArray(parsed.infoTable)
      ? parsed.infoTable
      : [parsed.infoTable];
  }

  // Determine if values need to be scaled (pre-2023 values are in thousands)
  const reportYear = new Date(reportDate).getFullYear();
  const valueMultiplier = reportYear < 2023 ? 1000n : 1n;

  const holdings: HoldingData[] = infoTables.map((entry) => {
    const e = entry as Record<string, unknown>;
    const shrsOrPrnAmt = e.shrsOrPrnAmt as Record<string, unknown> | undefined;
    const votingAuthority = e.votingAuthority as Record<string, unknown> | undefined;

    // Extract value - may be in different fields
    const rawValue = e.value ?? (e as Record<string, unknown>)['value'];
    const value = BigInt(Math.round(Number(rawValue) || 0)) * valueMultiplier;

    // Extract share count
    const rawShares = shrsOrPrnAmt?.sshPrnamt ?? shrsOrPrnAmt?.['sshPrnamt'] ?? 0;
    const shares = BigInt(Math.round(Number(rawShares) || 0));

    return {
      cusip: String(e.cusip || e.CUSIP || '').trim(),
      issuerName: String(e.nameOfIssuer || e.issuerName || '').trim(),
      value,
      shares,
      shOrPrnAmt: String(shrsOrPrnAmt?.sshPrnamtType ?? 'SH'),
      investmentDiscretion: String(e.investmentDiscretion || 'SOLE'),
      votingAuthority: {
        sole: BigInt(Number(votingAuthority?.Sole ?? votingAuthority?.sole ?? 0)),
        shared: BigInt(Number(votingAuthority?.Shared ?? votingAuthority?.shared ?? 0)),
        none: BigInt(Number(votingAuthority?.None ?? votingAuthority?.none ?? 0)),
      },
    };
  });

  return {
    holdings: holdings.filter(h => h.cusip), // Filter out entries without CUSIP
    reportDate,
  };
}

/**
 * Normalize CUSIP to 9 characters
 */
export function normalizeCusip(cusip: string): string {
  // Remove any non-alphanumeric characters and uppercase
  const clean = cusip.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  // Pad to 9 characters if needed
  return clean.padEnd(9, '0').slice(0, 9);
}
