import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { inr, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["pays", user?.id],
    queryFn: async () => (await supabase.from("payments").select("*, doctors(full_name)").eq("patient_id", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  const total = data.filter((p: any) => p.status === "succeeded").reduce((s: number, p: any) => s + Number(p.amount), 0);

  const downloadReceipt = (p: any) => {
    const txt = `MediCare+ Receipt\n\nInvoice: ${p.invoice_number}\nDoctor: ${p.doctors?.full_name ?? "-"}\nAmount: ${inr(Number(p.amount))}\nMethod: ${p.method.toUpperCase()}\nUTR: ${p.utr ?? "-"}\nStatus: ${p.status}\nDate: ${formatDateTime(p.paid_at ?? p.created_at)}\n\nThank you for choosing MediCare+`;
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${p.invoice_number}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Payment history</h1>
        <Card className="px-5 py-3"><div className="text-xs text-muted-foreground">Total spent</div><div className="text-xl font-bold">{inr(total)}</div></Card>
      </div>

      {data.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">No payments yet.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-5 py-3">Invoice</th><th>Doctor</th><th>Amount</th><th>Status</th><th>Date</th><th /></tr>
            </thead>
            <tbody>
              {data.map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-5 py-3 font-mono text-xs">{p.invoice_number}</td>
                  <td>{p.doctors?.full_name ?? "—"}</td>
                  <td className="font-semibold">{inr(Number(p.amount))}</td>
                  <td><Badge variant={p.status === "succeeded" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>{p.status}</Badge></td>
                  <td className="text-muted-foreground">{formatDateTime(p.created_at)}</td>
                  <td className="py-2 pr-5 text-right">
                    {p.status === "pending" ? (
                      <Link to="/pay/$paymentId" params={{ paymentId: p.id }}><Button size="sm" variant="outline">Pay now</Button></Link>
                    ) : p.status === "succeeded" ? (
                      <Button size="sm" variant="ghost" onClick={() => downloadReceipt(p)}><Download className="h-3 w-3" /></Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
