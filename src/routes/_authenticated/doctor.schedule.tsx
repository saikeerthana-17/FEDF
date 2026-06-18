import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, Clock, Video as VideoIcon, User, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor/schedule")({
  component: SchedulePage,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function SchedulePage() {
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [appts, setAppts] = useState<any[]>([]);
  const [avail, setAvail] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAll = async (did: string) => {
    const [a, av, lv] = await Promise.all([
      supabase.from("appointments").select("*").eq("doctor_id", did).order("scheduled_at"),
      supabase.from("doctor_availability").select("*").eq("doctor_id", did).order("day_of_week"),
      supabase.from("doctor_leaves").select("*").eq("doctor_id", did).order("leave_date"),
    ]);
    setAppts(a.data ?? []);
    setAvail(av.data ?? []);
    setLeaves(lv.data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: doc } = await supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle();
      if (!doc) { setLoading(false); return; }
      setDoctorId(doc.id);
      await loadAll(doc.id);
      setLoading(false);
    })();
  }, [user]);

  const upcoming = appts.filter((a) => new Date(a.scheduled_at) >= new Date());
  const past = appts.filter((a) => new Date(a.scheduled_at) < new Date());

  const upsertSlot = async (dow: number, field: "start_time" | "end_time" | "slot_minutes", value: string) => {
    if (!doctorId) return;
    const existing = avail.find((a) => a.day_of_week === dow);
    const next: any = existing ? { ...existing, [field]: value } : { doctor_id: doctorId, day_of_week: dow, start_time: "09:00", end_time: "17:00", slot_minutes: 30, [field]: value };
    if (existing) {
      const { error } = await supabase.from("doctor_availability").update(next).eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("doctor_availability").insert(next);
      if (error) return toast.error(error.message);
    }
    loadAll(doctorId);
  };

  const removeDay = async (id: string) => {
    if (!doctorId) return;
    await supabase.from("doctor_availability").delete().eq("id", id);
    loadAll(doctorId);
  };

  const addDay = async (dow: number) => upsertSlot(dow, "start_time", "09:00");

  const addLeave = async () => {
    if (!doctorId || !leaveDate) return;
    const { error } = await supabase.from("doctor_leaves").insert({ doctor_id: doctorId, leave_date: leaveDate, reason: leaveReason || null });
    if (error) return toast.error(error.message);
    setLeaveDate(""); setLeaveReason("");
    toast.success("Leave added");
    loadAll(doctorId);
  };

  const removeLeave = async (id: string) => {
    if (!doctorId) return;
    await supabase.from("doctor_leaves").delete().eq("id", id);
    loadAll(doctorId);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Schedule</h1>
        <p className="text-sm text-muted-foreground">Manage your availability, leaves and appointments.</p>
      </div>

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="availability">Weekly hours</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Today" value={appts.filter((a) => new Date(a.scheduled_at).toDateString() === new Date().toDateString()).length} />
            <StatCard label="Upcoming" value={upcoming.length} />
            <StatCard label="Completed" value={past.length} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Upcoming</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!loading && upcoming.length === 0 && <div className="text-sm text-muted-foreground">No upcoming appointments.</div>}
              {upcoming.map((a) => <ApptRow key={a.id} a={a} />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Past</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!loading && past.length === 0 && <div className="text-sm text-muted-foreground">No past appointments.</div>}
              {past.slice(0, 10).map((a) => <ApptRow key={a.id} a={a} />)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly working hours</CardTitle>
              <p className="text-xs text-muted-foreground">Patients will only see slots that fall inside these windows.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {DAYS.map((d, idx) => {
                const row = avail.find((a) => a.day_of_week === idx);
                return (
                  <div key={idx} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 p-3">
                    <div className="w-12 text-sm font-medium">{d}</div>
                    {row ? (
                      <>
                        <Input type="time" value={row.start_time?.slice(0, 5)} onChange={(e) => upsertSlot(idx, "start_time", e.target.value)} className="w-32" />
                        <span className="text-muted-foreground">–</span>
                        <Input type="time" value={row.end_time?.slice(0, 5)} onChange={(e) => upsertSlot(idx, "end_time", e.target.value)} className="w-32" />
                        <Input type="number" min={5} max={180} value={row.slot_minutes} onChange={(e) => upsertSlot(idx, "slot_minutes", e.target.value)} className="w-24" />
                        <span className="text-xs text-muted-foreground">min/slot</span>
                        <Button variant="ghost" size="icon" onClick={() => removeDay(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => addDay(idx)}><Plus className="mr-1 h-3 w-3" />Add hours</Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves">
          <Card>
            <CardHeader><CardTitle className="text-base">Days off</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Date</div>
                  <Input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="w-48" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="mb-1 text-xs text-muted-foreground">Reason (optional)</div>
                  <Input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Conference, personal…" />
                </div>
                <Button onClick={addLeave}><Plus className="mr-1 h-3 w-3" />Add leave</Button>
              </div>
              <div className="space-y-2">
                {leaves.length === 0 && <div className="text-sm text-muted-foreground">No leaves added.</div>}
                {leaves.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                    <div>
                      <div className="text-sm font-medium">{new Date(l.leave_date).toLocaleDateString()}</div>
                      {l.reason && <div className="text-xs text-muted-foreground">{l.reason}</div>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeLeave(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold">{value}</div>
    </CardContent></Card>
  );
}

function ApptRow({ a }: { a: any }) {
  const d = new Date(a.scheduled_at);
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {a.mode === "video" ? <VideoIcon className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </div>
        <div>
          <div className="text-sm font-medium">{a.reason || "Consultation"}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{d.toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={a.status === "confirmed" ? "default" : "secondary"}>{a.status}</Badge>
        {a.status !== "completed" && (
          <Link to="/doctor/prescribe/$appointmentId" params={{ appointmentId: a.id }}>
            <Button size="sm" variant="outline">Prescribe</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
