"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalFunds: number;
  totalSecurities: number;
  totalHoldings: number;
  totalAUM: string;
  lastSyncDate: string | null;
}

interface MostHeldStock {
  securityId: number;
  cusip: string;
  issuerName: string;
  ticker: string | null;
  fundCount: number;
  totalValue: string;
}

function formatValue(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topStocks, setTopStocks] = useState<MostHeldStock[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [statsRes, overlapRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/overlap?type=most-held&limit=10"),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (overlapRes.ok) {
        setTopStocks(await overlapRes.json());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async (file?: File) => {
    setSyncing(true);
    setSyncMessage("Syncing...");

    try {
      let response;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        response = await fetch("/api/sync", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      }

      const result = await response.json();

      if (result.ok) {
        setSyncMessage(
          `Synced ${result.synced} funds. ${result.failed} failed.`
        );
        fetchData();
      } else {
        setSyncMessage(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      setSyncMessage(`Sync error: ${error}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSync(file);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            13F Holdings Overlap Analyzer
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={syncing}
          >
            Upload Fund List
          </Button>
          <Button onClick={() => handleSync()} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync Default Funds"}
          </Button>
        </div>
      </div>

      {syncMessage && (
        <div className="bg-muted p-4 rounded-lg">
          <p>{syncMessage}</p>
        </div>
      )}

      {/* Upload Instructions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">How to Add Funds</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Option 1:</strong> Click &quot;Sync Default Funds&quot; to pull 13F filings for 20 major hedge funds (Berkshire, Bridgewater, Renaissance, etc.)
          </p>
          <p>
            <strong>Option 2:</strong> Upload an Excel (.xlsx) or CSV file with your own fund list:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>Column A:</strong> Fund name (required)</li>
            <li><strong>Column B:</strong> CIK number (optional - will auto-lookup if blank)</li>
          </ul>
          <p className="text-xs mt-2">
            Example: &quot;Pershing Square&quot; in column A, &quot;0001336528&quot; in column B
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Funds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFunds ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Securities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalSecurities ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalHoldings ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Combined AUM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalAUM ? formatValue(stats.totalAUM) : "$0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Sync */}
      {stats?.lastSyncDate && (
        <p className="text-sm text-muted-foreground">
          Last synced: {new Date(stats.lastSyncDate).toLocaleString()}
        </p>
      )}

      {/* Top Held Stocks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Top 10 Most-Held Stocks</span>
            <Link href="/overlap">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topStocks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No data yet. Click &quot;Sync Default Funds&quot; to pull 13F
              filings.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="text-right">Funds Holding</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topStocks.map((stock, index) => (
                  <TableRow key={stock.securityId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <Link
                        href={`/securities/${stock.securityId}`}
                        className="hover:underline"
                      >
                        {stock.issuerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {stock.ticker ? (
                        <Badge variant="secondary">{stock.ticker}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge>{stock.fundCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatValue(stock.totalValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
