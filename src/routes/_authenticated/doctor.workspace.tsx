import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, StickyNote } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor/workspace")({
  component: WorkspacePage,
});

function WorkspacePage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("doctor_notes").select("*").eq("doctor_user_id", user.id).order("created_at", { ascending: false });
    setNotes(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user || !title.trim()) return;
    const { error } = await supabase.from("doctor_notes").insert({ doctor_user_id: user.id, title, body, is_task: true });
    if (error) return toast.error(error.message);
    setTitle(""); setBody(""); toast.success("Saved"); load();
  };

  const toggle = async (id: string, done: boolean) => {
    await supabase.from("doctor_notes").update({ done: !done }).eq("id", id);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Workspace</h1>
        <p className="text-sm text-muted-foreground">Clinical notes, tasks and reminders.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" />New note / task</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details…" rows={3} />
          <Button onClick={add}>Save note</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">My notes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {notes.length === 0 && <div className="flex items-center gap-2 text-sm text-muted-foreground"><StickyNote className="h-4 w-4" />No notes yet.</div>}
          {notes.map((n) => (
            <div key={n.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
              <Checkbox checked={n.done} onCheckedChange={() => toggle(n.id, n.done)} className="mt-1" />
              <div className="flex-1">
                <div className={`text-sm font-medium ${n.done ? "line-through text-muted-foreground" : ""}`}>{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
              </div>
              <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
