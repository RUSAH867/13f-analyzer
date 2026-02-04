"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Fund {
  id: number;
  name: string;
  cik: string;
  latestFilingDate: string | null;
  holdingsCount: number;
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

export default function FundsPage() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFunds = async () => {
      try {
        const res = await fetch(`/api/funds?search=${encodeURIComponent(search)}`);
        if (res.ok) {
          setFunds(await res.json());
        }
      } catch (error) {
        console.error("Error fetching funds:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchFunds, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Funds</h1>
        <p className="text-muted-foreground mt-1">
          All tracked hedge funds with 13F filings
        </p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search funds..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fund List ({funds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : funds.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No funds found. Sync data from the dashboard.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund Name</TableHead>
                  <TableHead>CIK</TableHead>
                  <TableHead className="text-right">Holdings</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Last Filing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funds.map((fund) => (
                  <TableRow key={fund.id}>
                    <TableCell>
                      <Link
                        href={`/funds/${fund.id}`}
                        className="font-medium hover:underline"
                      >
                        {fund.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{fund.cik}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {fund.holdingsCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatValue(fund.totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fund.latestFilingDate
                        ? new Date(fund.latestFilingDate).toLocaleDateString()
                        : "-"}
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
