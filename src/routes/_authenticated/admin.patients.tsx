import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/patients")({
  component: AdminPatientsPage,
});

function AdminPatientsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">All Patients</h1>
        <p className="text-sm text-muted-foreground">{items.length} registered users.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <Avatar><AvatarFallback>{initials(p.full_name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{p.phone || "No phone"}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
