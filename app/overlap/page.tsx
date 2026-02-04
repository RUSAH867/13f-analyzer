"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface MostHeldStock {
  securityId: number;
  cusip: string;
  issuerName: string;
  ticker: string | null;
  fundCount: number;
  totalValue: string;
  funds: { id: number; name: string; value: string }[];
}

interface UniquePick {
  securityId: number;
  cusip: string;
  issuerName: string;
  ticker: string | null;
  fundId: number;
  fundName: string;
  value: string;
}

interface FundSimilarity {
  fund1Id: number;
  fund1Name: string;
  fund2Id: number;
  fund2Name: string;
  sharedSecurities: number;
  totalSecuritiesFund1: number;
  totalSecuritiesFund2: number;
  overlapPercentage: number;
}

interface ConsensusBuySell {
  securityId: number;
  cusip: string;
  issuerName: string;
  ticker: string | null;
  action: "buy" | "sell";
  fundCount: number;
  funds: { id: number; name: string }[];
}

function formatValue(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

export default function OverlapPage() {
  const [mostHeld, setMostHeld] = useState<MostHeldStock[]>([]);
  const [uniquePicks, setUniquePicks] = useState<UniquePick[]>([]);
  const [similarities, setSimilarities] = useState<FundSimilarity[]>([]);
  const [consensus, setConsensus] = useState<ConsensusBuySell[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("most-held");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/overlap?type=${activeTab}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          switch (activeTab) {
            case "most-held":
              setMostHeld(data);
              break;
            case "unique":
              setUniquePicks(data);
              break;
            case "similarity":
              setSimilarities(data);
              break;
            case "consensus":
              setConsensus(data);
              break;
          }
        }
      } catch (error) {
        console.error("Error fetching overlap data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overlap Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Analyze holding patterns across hedge funds
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="most-held">Most Held</TabsTrigger>
          <TabsTrigger value="unique">Unique Picks</TabsTrigger>
          <TabsTrigger value="similarity">Fund Similarity</TabsTrigger>
          <TabsTrigger value="consensus">Consensus Moves</TabsTrigger>
        </TabsList>

        <TabsContent value="most-held" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Widely Held Stocks</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : mostHeld.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No data available.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Security</TableHead>
                      <TableHead>Ticker</TableHead>
                      <TableHead className="text-right">Funds</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead>Top Holders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mostHeld.map((stock, index) => (
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
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge>{stock.fundCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatValue(stock.totalValue)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {stock.funds
                            .slice(0, 3)
                            .map((f) => f.name)
                            .join(", ")}
                          {stock.funds.length > 3 && "..."}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unique" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Unique Picks (Held by Only One Fund)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : uniquePicks.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No unique picks found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Security</TableHead>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uniquePicks.map((pick) => (
                      <TableRow key={pick.securityId}>
                        <TableCell>
                          <Link
                            href={`/securities/${pick.securityId}`}
                            className="hover:underline"
                          >
                            {pick.issuerName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {pick.ticker ? (
                            <Badge variant="secondary">{pick.ticker}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/funds/${pick.fundId}`}
                            className="hover:underline"
                          >
                            {pick.fundName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatValue(pick.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="similarity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fund Similarity (Shared Holdings)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : similarities.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Need at least 2 funds to compare.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fund 1</TableHead>
                      <TableHead>Fund 2</TableHead>
                      <TableHead className="text-right">Shared Securities</TableHead>
                      <TableHead className="text-right">Overlap %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {similarities.slice(0, 50).map((sim, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Link
                            href={`/funds/${sim.fund1Id}`}
                            className="hover:underline"
                          >
                            {sim.fund1Name}
                          </Link>
                          <span className="text-muted-foreground ml-2">
                            ({sim.totalSecuritiesFund1})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/funds/${sim.fund2Id}`}
                            className="hover:underline"
                          >
                            {sim.fund2Name}
                          </Link>
                          <span className="text-muted-foreground ml-2">
                            ({sim.totalSecuritiesFund2})
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {sim.sharedSecurities}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              sim.overlapPercentage > 30
                                ? "default"
                                : "secondary"
                            }
                          >
                            {sim.overlapPercentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consensus" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Consensus Buys & Sells (This Quarter)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : consensus.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No consensus moves found (need 3+ funds making the same move).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Security</TableHead>
                      <TableHead>Ticker</TableHead>
                      <TableHead className="text-right">Funds</TableHead>
                      <TableHead>Participating Funds</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consensus.map((item) => (
                      <TableRow key={`${item.action}-${item.securityId}`}>
                        <TableCell>
                          <Badge
                            variant={
                              item.action === "buy" ? "default" : "destructive"
                            }
                          >
                            {item.action.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/securities/${item.securityId}`}
                            className="hover:underline"
                          >
                            {item.issuerName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {item.ticker ? (
                            <Badge variant="secondary">{item.ticker}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.fundCount}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.funds
                            .slice(0, 3)
                            .map((f) => f.name)
                            .join(", ")}
                          {item.funds.length > 3 && "..."}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
