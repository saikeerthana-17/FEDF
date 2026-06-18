import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Star, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, inr, doctorAvatarUrl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/doctors")({
  component: DoctorsPage,
});

function DoctorsPage() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => (await supabase.from("public_doctors" as any).select("*").eq("is_verified", true).order("rating", { ascending: false })).data ?? [],
  });
  const filtered = data.filter((d: any) =>
    !q || d.full_name.toLowerCase().includes(q.toLowerCase()) || d.specialty.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Find your doctor</h1>
        <p className="text-sm text-muted-foreground">Verified specialists across India</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name or specialty..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Card key={i} className="h-48 animate-pulse bg-muted" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d: any) => (
            <Card key={d.id} className="group p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated">
              <div className="flex gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-primary/15">
                  <AvatarImage src={doctorAvatarUrl(d.avatar_url)} alt={d.full_name} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">{initials(d.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Link to="/doctor/$doctorId" params={{ doctorId: d.id }} className="font-semibold hover:underline">
                    {d.full_name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{d.specialty}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-warning text-warning" />{d.rating}</span>
                    <span className="text-muted-foreground">· {d.experience_years} yrs</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{d.bio}</p>
              {d.city && <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{d.city}</div>}
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <div>
                  <div className="text-xs text-muted-foreground">Consultation</div>
                  <div className="text-lg font-semibold">{inr(Number(d.consultation_fee))}</div>
                </div>
                <div className="flex gap-2">
                  <Link to="/doctor/$doctorId" params={{ doctorId: d.id }}>
                    <Button size="sm" variant="outline">Profile</Button>
                  </Link>
                  <Link to="/book/$doctorId" params={{ doctorId: d.id }}>
                    <Button size="sm" className="bg-gradient-primary">Book <ArrowRight className="ml-1 h-3 w-3" /></Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <Card className="col-span-full p-12 text-center text-muted-foreground">No doctors found.</Card>}
        </div>
      )}
    </div>
  );
}
