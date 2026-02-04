"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Security {
  id: number;
  cusip: string;
  issuerName: string;
  ticker: string | null;
}

interface Holding {
  id: number;
  securityId: number;
  value: string;
  shares: string;
  security: Security;
}

interface ChangeItem {
  holding: Holding;
  previousValue: string;
  change: string;
}

interface FundDetail {
  id: number;
  name: string;
  cik: string;
  currentHoldings: Holding[];
  totalValue: string;
  changes: {
    added: Holding[];
    removed: Holding[];
    increased: ChangeItem[];
    decreased: ChangeItem[];
  } | null;
}

function formatValue(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatShares(shares: string | number): string {
  const num = typeof shares === "string" ? parseFloat(shares) : shares;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toLocaleString();
}

export default function FundDetailPage() {
  const params = useParams();
  const [fund, setFund] = useState<FundDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFund = async () => {
      try {
        const res = await fetch(`/api/funds/${params.id}`);
        if (res.ok) {
          setFund(await res.json());
        }
      } catch (error) {
        console.error("Error fetching fund:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchFund();
    }
  }, [params.id]);

  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">Loading...</p>;
  }

  if (!fund) {
    return <p className="text-center py-8 text-muted-foreground">Fund not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/funds">
            <Button variant="ghost" size="sm" className="mb-2">
              &larr; Back to Funds
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{fund.name}</h1>
          <p className="text-muted-foreground mt-1">
            CIK: {fund.cik} | Total Value: {formatValue(fund.totalValue)} |{" "}
            {fund.currentHoldings.length} holdings
          </p>
        </div>
      </div>

      <Tabs defaultValue="holdings">
        <TabsList>
          <TabsTrigger value="holdings">Current Holdings</TabsTrigger>
          {fund.changes && <TabsTrigger value="changes">QoQ Changes</TabsTrigger>}
        </TabsList>

        <TabsContent value="holdings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Holdings ({fund.currentHoldings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Ticker</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">% of Portfolio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fund.currentHoldings.map((holding, index) => {
                    const pct =
                      (parseFloat(holding.value) / parseFloat(fund.totalValue)) * 100;
                    return (
                      <TableRow key={holding.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Link
                            href={`/securities/${holding.securityId}`}
                            className="hover:underline"
                          >
                            {holding.security.issuerName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {holding.security.ticker ? (
                            <Badge variant="secondary">
                              {holding.security.ticker}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatShares(holding.shares)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatValue(holding.value)}
                        </TableCell>
                        <TableCell className="text-right">
                          {pct.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {fund.changes && (
          <TabsContent value="changes" className="mt-4 space-y-6">
            {/* New Positions */}
            {fund.changes.added.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">
                    New Positions ({fund.changes.added.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Security</TableHead>
                        <TableHead>Ticker</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fund.changes.added.map((holding) => (
                        <TableRow key={holding.id}>
                          <TableCell>{holding.security.issuerName}</TableCell>
                          <TableCell>
                            {holding.security.ticker || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatShares(holding.shares)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            +{formatValue(holding.value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Closed Positions */}
            {fund.changes.removed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">
                    Closed Positions ({fund.changes.removed.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Security</TableHead>
                        <TableHead>Ticker</TableHead>
                        <TableHead className="text-right">Previous Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fund.changes.removed.map((holding) => (
                        <TableRow key={holding.id}>
                          <TableCell>{holding.security.issuerName}</TableCell>
                          <TableCell>
                            {holding.security.ticker || "-"}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            -{formatValue(holding.value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Increased Positions */}
            {fund.changes.increased.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">
                    Increased Positions ({fund.changes.increased.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Security</TableHead>
                        <TableHead className="text-right">Previous</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fund.changes.increased.slice(0, 20).map((item) => (
                        <TableRow key={item.holding.id}>
                          <TableCell>
                            {item.holding.security.issuerName}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatValue(item.previousValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatValue(item.holding.value)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            +{formatValue(item.change)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Decreased Positions */}
            {fund.changes.decreased.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">
                    Decreased Positions ({fund.changes.decreased.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Security</TableHead>
                        <TableHead className="text-right">Previous</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fund.changes.decreased.slice(0, 20).map((item) => (
                        <TableRow key={item.holding.id}>
                          <TableCell>
                            {item.holding.security.issuerName}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatValue(item.previousValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatValue(item.holding.value)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatValue(item.change)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
