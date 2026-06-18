import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/format";
import { Search, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctor/patients")({
  component: PatientsPage,
});

function PatientsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: doc } = await supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle();
      if (!doc) return;
      const { data: appts } = await supabase.from("appointments").select("patient_id").eq("doctor_id", doc.id);
      const ids = Array.from(new Set((appts ?? []).map((a) => a.patient_id)));
      if (ids.length === 0) return;
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
      setPatients(profiles ?? []);
    })();
  }, [user]);

  const filtered = patients.filter((p) => !q || p.full_name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">My Patients</h1>
          <p className="text-sm text-muted-foreground">{patients.length} patients under your care.</p>
        </div>
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient…" className="pl-9" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <Avatar><AvatarFallback>{initials(p.full_name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.full_name || "Patient"}</div>
                <div className="text-xs text-muted-foreground">{p.phone || "No phone"}</div>
              </div>
              <button className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted">
                <FileText className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No patients yet.</p>}
      </div>
    </div>
  );
}
