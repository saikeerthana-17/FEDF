import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pill, Plus, Trash2, MapPin, ExternalLink, Loader2, Search, PackageCheck, PackageX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, nearbySearchUrl } from "@/hooks/use-location";
import { haversineKm } from "@/lib/google-maps";

export const Route = createFileRoute("/_authenticated/pharmacy")({
  head: () => ({ meta: [{ title: "Pharmacy — MediCare+" }] }),
  component: PharmacyPage,
});

interface CartItem { medicine_id?: string; name: string; qty: string; price?: number; stock?: number; pharmacy_id?: string; }
interface Medicine { id: string; pharmacy_id: string; name: string; brand: string | null; price: number; stock: number; }
interface Pharmacy { id: string; name: string; city: string | null; lat: number | null; lng: number | null; }

function PharmacyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { coords, permission, requestLocation, requesting } = useLocation();
  const [items, setItems] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(Medicine & { pharmacy: Pharmacy })[]>([]);
  const [searching, setSearching] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);

  const loadOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pharmacy_orders").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    setOrders(data ?? []);
  };
  useEffect(() => { loadOrders(); /* eslint-disable-next-line */ }, [user]);

  // Load pharmacies once
  useEffect(() => {
    supabase.from("pharmacies").select("*").then(({ data }) => setPharmacies((data as any) ?? []));
  }, []);

  // Realtime: refresh open orders when status/eta change
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`my-orders-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pharmacy_orders", filter: `user_id=eq.${user.id}` },
        () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user]);

  // Live medicine search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("medicines")
        .select("id,pharmacy_id,name,brand,price,stock,pharmacies(id,name,city,lat,lng)")
        .ilike("name", `%${q}%`)
        .order("stock", { ascending: false })
        .limit(20);
      if (!active) return;
      setResults((data as any) ?? []);
      setSearching(false);
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  // Realtime stock updates: refresh visible results
  useEffect(() => {
    const ch = supabase
      .channel("medicines-stock")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "medicines" }, (payload) => {
        const m = payload.new as any;
        setResults((rs) => rs.map((r) => r.id === m.id ? { ...r, stock: m.stock, price: m.price } : r));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const addToCart = (m: any) => {
    if (m.stock <= 0) return toast.error("Out of stock");
    setItems((arr) => {
      const existing = arr.find((i) => i.medicine_id === m.id);
      if (existing) return arr.map((i) => i.medicine_id === m.id ? { ...i, qty: String(Number(i.qty) + 1) } : i);
      return [...arr, { medicine_id: m.id, name: m.name, qty: "1", price: Number(m.price), stock: m.stock, pharmacy_id: m.pharmacy_id }];
    });
    toast.success(`Added ${m.name}`);
  };

  const updateItem = (i: number, patch: Partial<CartItem>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  // Pick pharmacy: first item's pharmacy_id, else nearest verified pharmacy
  const chosenPharmacy = useMemo<Pharmacy | null>(() => {
    const cartPh = items.find((i) => i.pharmacy_id)?.pharmacy_id;
    if (cartPh) return pharmacies.find((p) => p.id === cartPh) ?? null;
    if (!coords || pharmacies.length === 0) return pharmacies[0] ?? null;
    return [...pharmacies].sort((a, b) =>
      haversineKm({ lat: coords.lat, lng: coords.lng }, { lat: a.lat ?? 0, lng: a.lng ?? 0 }) -
      haversineKm({ lat: coords.lat, lng: coords.lng }, { lat: b.lat ?? 0, lng: b.lng ?? 0 })
    )[0];
  }, [items, coords, pharmacies]);

  const distanceKm = useMemo(() => {
    if (!coords || !chosenPharmacy?.lat || !chosenPharmacy?.lng) return null;
    return haversineKm({ lat: coords.lat, lng: coords.lng }, { lat: chosenPharmacy.lat, lng: chosenPharmacy.lng });
  }, [coords, chosenPharmacy]);

  const etaMinutes = useMemo(() => {
    // 10 min prep + ~3 min/km
    if (distanceKm == null) return 30;
    return Math.max(15, Math.round(10 + distanceKm * 3));
  }, [distanceKm]);

  const total = useMemo(() =>
    items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0),
  [items]);

  const submit = async () => {
    if (!user) return;
    const clean = items.filter((i) => i.name.trim() && Number(i.qty) > 0);
    if (clean.length === 0) return toast.error("Add at least one medicine");
    setSubmitting(true);
    let c = coords; if (!c) c = await requestLocation();
    const { data, error } = await supabase.from("pharmacy_orders").insert({
      user_id: user.id,
      items: clean as unknown as any,
      notes: notes || null,
      delivery_address: address || null,
      lat: c?.lat ?? null, lng: c?.lng ?? null,
      status: "pending",
      pharmacy_id: chosenPharmacy?.id ?? null,
      eta_minutes: etaMinutes,
      total_amount: total,
    }).select("id").single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Order placed — tracking live");
    setItems([]); setNotes("");
    if (data?.id) navigate({ to: "/track-order/$orderId", params: { orderId: data.id } });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Pill className="h-5 w-5" /></span>
          Pharmacy Order
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Search medicines with live stock & track delivery in real time.</p>
      </div>

      {/* Search medicines with live stock */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> Search medicines</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Paracetamol, Azithromycin…" />
          {searching && <div className="text-xs text-muted-foreground">Searching…</div>}
          {results.length > 0 && (
            <div className="max-h-80 overflow-auto rounded-lg border divide-y">
              {results.map((m: any) => {
                const inStock = m.stock > 0;
                return (
                  <div key={m.id} className="flex items-center justify-between p-3 gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{m.name} {m.brand && <span className="text-muted-foreground font-normal">· {m.brand}</span>}</div>
                      <div className="text-xs text-muted-foreground truncate">{m.pharmacies?.name} · ₹{Number(m.price).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={inStock ? "secondary" : "destructive"} className="text-xs">
                        {inStock ? <><PackageCheck className="h-3 w-3 mr-1" />{m.stock} left</> : <><PackageX className="h-3 w-3 mr-1" />Out</>}
                      </Badge>
                      <Button size="sm" variant="outline" disabled={!inStock} onClick={() => addToCart(m)}>Add</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {query.length >= 2 && !searching && results.length === 0 && (
            <div className="text-xs text-muted-foreground">No matching medicines.</div>
          )}
        </CardContent>
      </Card>

      {/* Delivery location */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Delivery location</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {coords ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="font-medium">GPS captured</div>
              <div className="mt-1 text-xs text-muted-foreground">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · ±{Math.round(coords.accuracy)}m</div>
              <a className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline" target="_blank" rel="noreferrer" href={nearbySearchUrl(coords.lat, coords.lng, "pharmacy")}>
                See nearby pharmacies on Google Maps <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={requestLocation} disabled={requesting}>
              {requesting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <MapPin className="mr-2 h-3 w-3" />}
              {permission === "denied" ? "Location blocked — enable in browser" : "Share my location"}
            </Button>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="addr">Delivery address (optional)</Label>
            <Textarea id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat, street, landmark…" rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Cart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Your cart</span>
            {chosenPharmacy && (
              <span className="text-xs font-normal text-muted-foreground">
                From <strong className="text-foreground">{chosenPharmacy.name}</strong>{distanceKm != null && ` · ${distanceKm.toFixed(1)} km`} · ETA ~{etaMinutes} min
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">Search above and add medicines, or type a custom one below.</p>
          )}
          {items.map((it, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input className="flex-1" placeholder="Medicine name" value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} />
              <Input className="w-20" type="number" min="1" max={it.stock ?? 99} placeholder="Qty" value={it.qty} onChange={(e) => updateItem(i, { qty: e.target.value })} />
              {it.price != null && <span className="text-sm text-muted-foreground w-20 text-right">₹{(it.price * Number(it.qty || 0)).toFixed(2)}</span>}
              <Button variant="ghost" size="icon" onClick={() => setItems((arr) => arr.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems((arr) => [...arr, { name: "", qty: "1" }])}>
            <Plus className="mr-1 h-3 w-3" /> Add custom medicine
          </Button>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes for pharmacist</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions…" rows={2} />
          </div>
          {total > 0 && (
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Estimated total</span>
              <span className="font-semibold">₹{total.toFixed(2)}</span>
            </div>
          )}
          <Button onClick={submit} disabled={submitting || items.length === 0} className="w-full bg-gradient-primary">
            {submitting ? "Placing order…" : "Place order & track live"}
          </Button>
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent orders</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {orders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
          {orders.map((o) => (
            <Link key={o.id} to="/track-order/$orderId" params={{ orderId: o.id }} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40 transition">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {(o.items as CartItem[]).map((i) => i.name).join(", ") || "Order"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()}
                  {o.eta_minutes != null && o.status !== "delivered" && o.status !== "cancelled" && ` · ETA ~${o.eta_minutes} min`}
                </div>
              </div>
              <Badge variant="outline" className="capitalize">{(o.status as string).replace(/_/g, " ")}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
