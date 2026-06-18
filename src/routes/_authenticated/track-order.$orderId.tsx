import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock, MapPin, Package, Phone, Truck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/track-order/$orderId")({
  head: () => ({ meta: [{ title: "Order tracking — MediCare+" }] }),
  component: TrackOrder,
});

const STEPS: { key: string; label: string; icon: any }[] = [
  { key: "pending", label: "Order placed", icon: Package },
  { key: "accepted", label: "Pharmacy accepted", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing order", icon: Clock },
  { key: "out_for_delivery", label: "Out for delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function TrackOrder() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("pharmacy_orders").select("*").eq("id", orderId).maybeSingle();
      if (!active) return;
      setOrder(data);
      if (data?.pharmacy_id) {
        const { data: ph } = await supabase.from("pharmacies").select("*").eq("id", data.pharmacy_id).maybeSingle();
        if (active) setPharmacy(ph);
      }
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pharmacy_orders", filter: `id=eq.${orderId}` },
        (payload) => setOrder(payload.new))
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [orderId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!order) return <div className="mx-auto max-w-2xl py-12 text-center"><p className="text-muted-foreground">Order not found.</p><Link to="/pharmacy" className="text-primary underline mt-2 inline-block">Back to pharmacy</Link></div>;

  const status = order.status as string;
  const activeIdx = Math.max(0, STEPS.findIndex((s) => s.key === status));
  const isCancelled = status === "cancelled";
  const items = (order.items as { name: string; qty: string }[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Order tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            #{order.id.slice(0, 8).toUpperCase()} · placed {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <Badge variant={isCancelled ? "destructive" : status === "delivered" ? "default" : "secondary"} className="capitalize">
          {status.replace(/_/g, " ")}
        </Badge>
      </div>

      {!isCancelled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Live status</span>
              {order.eta_minutes != null && status !== "delivered" && (
                <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" /> ETA ~{order.eta_minutes} min
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-5 border-l-2 border-muted pl-6">
              {STEPS.map((step, i) => {
                const done = i <= activeIdx && !isCancelled;
                const current = i === activeIdx && !isCancelled;
                const Icon = step.icon;
                return (
                  <li key={step.key} className="relative">
                    <span className={`absolute -left-[34px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {done ? <Icon className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                    </span>
                    <div className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}>{step.label}</div>
                    {current && <div className="mt-0.5 text-xs text-primary animate-pulse">In progress…</div>}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {pharmacy && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pharmacy</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="font-medium">{pharmacy.name}</div>
            {pharmacy.address && <div className="flex items-start gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5 mt-0.5" />{pharmacy.address}</div>}
            {pharmacy.phone && (
              <a href={`tel:${pharmacy.phone}`} className="inline-flex items-center gap-2 text-primary hover:underline">
                <Phone className="h-3.5 w-3.5" /> {pharmacy.phone}
              </a>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span>{it.name}</span>
                <span className="text-muted-foreground">× {it.qty}</span>
              </li>
            ))}
          </ul>
          {order.total_amount != null && (
            <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm font-medium">
              <span>Total</span>
              <span>₹{Number(order.total_amount).toFixed(2)}</span>
            </div>
          )}
          {order.notes && <p className="mt-3 text-xs text-muted-foreground">Note: {order.notes}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" asChild><Link to="/pharmacy">Place another order</Link></Button>
      </div>
    </div>
  );
}
