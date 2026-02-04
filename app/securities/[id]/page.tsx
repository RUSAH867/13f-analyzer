"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Holder {
  fundId: number;
  fundName: string;
  value: string;
  shares: string;
  reportDate: string;
}

interface SecurityDetail {
  id: number;
  cusip: string;
  issuerName: string;
  ticker: string | null;
  holders: Holder[];
  fundCount: number;
  totalValue: string;
  totalShares: string;
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

export default function SecurityDetailPage() {
  const params = useParams();
  const [security, setSecurity] = useState<SecurityDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSecurity = async () => {
      try {
        const res = await fetch(`/api/securities/${params.id}`);
        if (res.ok) {
          setSecurity(await res.json());
        }
      } catch (error) {
        console.error("Error fetching security:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchSecurity();
    }
  }, [params.id]);

  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">Loading...</p>;
  }

  if (!security) {
    return (
      <p className="text-center py-8 text-muted-foreground">Security not found.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/overlap">
          <Button variant="ghost" size="sm" className="mb-2">
            &larr; Back to Overlap
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">{security.issuerName}</h1>
        <div className="flex gap-4 mt-2">
          {security.ticker && (
            <Badge variant="secondary" className="text-lg">
              {security.ticker}
            </Badge>
          )}
          <span className="text-muted-foreground">CUSIP: {security.cusip}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Funds Holding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{security.fundCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value Held
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatValue(security.totalValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Shares Held
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatShares(security.totalShares)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holders */}
      <Card>
        <CardHeader>
          <CardTitle>Fund Holders ({security.holders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {security.holders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No current holders.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {security.holders
                  .sort(
                    (a, b) => parseFloat(b.value) - parseFloat(a.value)
                  )
                  .map((holder) => {
                    const pct =
                      (parseFloat(holder.value) /
                        parseFloat(security.totalValue)) *
                      100;
                    return (
                      <TableRow key={holder.fundId}>
                        <TableCell>
                          <Link
                            href={`/funds/${holder.fundId}`}
                            className="font-medium hover:underline"
                          >
                            {holder.fundName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatShares(holder.shares)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatValue(holder.value)}
                        </TableCell>
                        <TableCell className="text-right">
                          {pct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
