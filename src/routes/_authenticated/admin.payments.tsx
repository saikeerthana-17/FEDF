import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, TrendingUp, RefreshCw, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const [pays, setPays] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("payments").select("*").order("created_at", { ascending: false }).then(({ data }) => setPays(data ?? []));
  }, []);

  const total = pays.filter((p) => p.status === "succeeded").reduce((s, p) => s + Number(p.amount), 0);
  const refunded = pays.reduce((s, p) => s + Number(p.refunded_amount ?? 0), 0);
  const failed = pays.filter((p) => p.status === "failed").length;
  const pending = pays.filter((p) => p.status === "pending").length;

  const items = [
    { label: "Revenue", value: `₹${total.toLocaleString()}`, icon: IndianRupee },
    { label: "Refunded", value: `₹${refunded.toLocaleString()}`, icon: RefreshCw },
    { label: "Failed", value: failed, icon: AlertCircle },
    { label: "Pending", value: pending, icon: TrendingUp },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Finance</h1>
        <p className="text-sm text-muted-foreground">Platform-wide payment overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <Card key={it.label}><CardContent className="p-5">
            <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wider text-muted-foreground">{it.label}</span><it.icon className="h-4 w-4 text-primary" /></div>
            <div className="mt-2 font-display text-2xl font-bold">{it.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent transactions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pays.slice(0, 25).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <div className="font-mono text-xs text-muted-foreground">{p.invoice_number || p.id.slice(0, 8)}</div>
                <div className="text-sm">₹{Number(p.amount).toLocaleString()} · {p.method.toUpperCase()}</div>
              </div>
              <Badge variant={p.status === "succeeded" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>
                {p.status}
              </Badge>
            </div>
          ))}
          {pays.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
