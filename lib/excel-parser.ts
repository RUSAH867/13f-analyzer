/**
 * Excel File Parser for Fund Lists
 */

import * as XLSX from 'xlsx';

export interface FundEntry {
  name: string;
  cik?: string; // Optional pre-specified CIK
}

/**
 * Parse Excel file containing fund names
 * Expects first column to contain fund names
 * Optional second column for pre-specified CIKs
 */
export function parseFundListExcel(buffer: ArrayBuffer): FundEntry[] {
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON (header: 1 returns array of arrays)
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  const funds: FundEntry[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const name = String(row[0] || '').trim();
    if (!name) continue;

    // Skip header row if it looks like a header
    if (i === 0 && (name.toLowerCase().includes('fund') || name.toLowerCase().includes('name'))) {
      continue;
    }

    const cik = row[1] ? String(row[1]).trim() : undefined;

    funds.push({ name, cik });
  }

  return funds;
}

/**
 * Parse CSV text containing fund names
 */
export function parseFundListCSV(text: string): FundEntry[] {
  const lines = text.split(/\r?\n/);
  const funds: FundEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    const name = parts[0];

    if (!name) continue;

    // Skip header row
    if (i === 0 && (name.toLowerCase().includes('fund') || name.toLowerCase().includes('name'))) {
      continue;
    }

    const cik = parts[1] || undefined;

    funds.push({ name, cik });
  }

  return funds;
}
