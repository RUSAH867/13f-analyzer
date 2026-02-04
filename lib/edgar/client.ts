/**
 * SEC EDGAR API Client with rate limiting
 * SEC requires max 10 requests/second and a User-Agent header
 */

const SEC_USER_AGENT = '13F-Analyzer/1.0 (contact@example.com)';
const MIN_REQUEST_INTERVAL = 100; // 100ms = 10 requests/second max

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();

  const response = await fetch(url, {
    headers: {
      'User-Agent': SEC_USER_AGENT,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`SEC API error: ${response.status} ${response.statusText} for ${url}`);
  }

  return response;
}

export interface SECCompanyInfo {
  cik: string;
  name: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
    };
  };
}

export interface Filing13F {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
}

/**
 * Fetch company submission data from SEC EDGAR
 */
export async function getCompanySubmissions(cik: string): Promise<SECCompanyInfo> {
  // CIK must be 10 digits with leading zeros
  const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

  const response = await rateLimitedFetch(url);
  return response.json();
}

/**
 * Get all 13F filings for a company
 */
export async function get13FFilings(cik: string): Promise<Filing13F[]> {
  const data = await getCompanySubmissions(cik);
  const filings: Filing13F[] = [];

  const { recent } = data.filings;

  for (let i = 0; i < recent.form.length; i++) {
    // 13F-HR is the main holdings report, 13F-HR/A is an amendment
    if (recent.form[i] === '13F-HR' || recent.form[i] === '13F-HR/A') {
      filings.push({
        accessionNumber: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate[i],
      });
    }
  }

  return filings;
}

/**
 * Fetch the 13F information table XML for a specific filing
 */
export async function get13FInfoTableXml(cik: string, accessionNumber: string): Promise<string> {
  // CIK without leading zeros for the URL path
  const cleanCik = cik.replace(/^0+/, '');
  // Accession number needs dashes removed for the path
  const accessionPath = accessionNumber.replace(/-/g, '');

  // Try common naming patterns for the info table file
  const filePatterns = [
    'form13fInfoTable.xml',
    'infotable.xml',
    'InfoTable.xml',
    'INFOTABLE.XML',
  ];

  for (const filename of filePatterns) {
    try {
      const url = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accessionPath}/${filename}`;
      const response = await rateLimitedFetch(url);
      return response.text();
    } catch {
      // Try next pattern
    }
  }

  // If standard patterns fail, fetch the index and find the info table
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accessionPath}/index.json`;
  try {
    const response = await rateLimitedFetch(indexUrl);
    const index = await response.json() as { directory: { item: { name: string; type: string }[] } };

    const infoTableFile = index.directory.item.find(
      (item: { name: string; type: string }) =>
        item.name.toLowerCase().includes('infotable') &&
        item.name.toLowerCase().endsWith('.xml')
    );

    if (infoTableFile) {
      const url = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accessionPath}/${infoTableFile.name}`;
      const xmlResponse = await rateLimitedFetch(url);
      return xmlResponse.text();
    }
  } catch {
    // Index fetch failed
  }

  throw new Error(`Could not find 13F info table for CIK ${cik}, accession ${accessionNumber}`);
}

/**
 * Fetch SEC company tickers mapping
 */
export async function getCompanyTickers(): Promise<Record<string, { cik_str: number; ticker: string; title: string }>> {
  const url = 'https://www.sec.gov/files/company_tickers.json';
  const response = await rateLimitedFetch(url);
  return response.json();
}
