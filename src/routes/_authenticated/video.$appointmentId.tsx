import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Video as VideoIcon, Send, FileSignature, MessageSquare, Plus, Trash2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useServerFn } from "@tanstack/react-start";
import { getOrCreateVideoRoom } from "@/lib/video.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/video/$appointmentId")({
  head: () => ({ meta: [{ title: "Video Consultation — MediCare+" }] }),
  component: VideoRoom,
});

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type Medicine = { name: string; dose?: string; frequency?: string; duration?: string };
type Rx = { id: string; medicines: Medicine[]; diagnosis: string | null; advice: string | null; created_at: string };

function VideoRoom() {
  const { appointmentId } = Route.useParams();
  const { user } = useAuth();
  const mint = useServerFn(getOrCreateVideoRoom);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appt, setAppt] = useState<any>(null);
  const [doctorRow, setDoctorRow] = useState<any>(null);
  const isDoctor = !!doctorRow && appt && doctorRow.id === appt.doctor_id;

  const startCall = async () => {
    setLoading(true); setError(null);
    try {
      const { room_url } = await mint({ data: { appointmentId } });
      setRoomUrl(room_url);
    } catch (e: any) { setError(e.message ?? "Failed to start"); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: a } = await supabase.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
      setAppt(a);
      const { data: d } = await supabase.from("doctors").select("id,user_id,full_name").eq("user_id", user.id).maybeSingle();
      setDoctorRow(d);
    })();
    startCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, user?.id]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Video consultation</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />End-to-end encrypted · powered by Daily.co
            </p>
          </div>
          {appt && <Badge variant="outline">#{appointmentId.slice(0, 8)}</Badge>}
        </div>

        {error && (
          <Card className="p-6">
            <div className="text-destructive">{error}</div>
            <Button onClick={startCall} className="mt-3">Retry</Button>
          </Card>
        )}

        {loading && !roomUrl && <Card className="p-12 text-center text-muted-foreground">Preparing secure room…</Card>}

        {roomUrl && (
          <Card className="overflow-hidden p-0">
            <iframe
              src={roomUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="h-[72vh] w-full border-0"
              title="Video consultation"
            />
          </Card>
        )}

        {!roomUrl && !loading && !error && (
          <Button onClick={startCall} className="gap-2"><VideoIcon className="h-4 w-4" />Join call</Button>
        )}
      </div>

      <Card className="flex h-[78vh] flex-col p-0">
        <Tabs defaultValue="chat" className="flex h-full flex-col">
          <TabsList className="m-2 grid grid-cols-2">
            <TabsTrigger value="chat" className="gap-1.5"><MessageSquare className="h-4 w-4" />Chat</TabsTrigger>
            <TabsTrigger value="rx" className="gap-1.5"><FileSignature className="h-4 w-4" />Prescription</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="m-0 flex-1 overflow-hidden">
            <ChatPanel appointmentId={appointmentId} />
          </TabsContent>
          <TabsContent value="rx" className="m-0 flex-1 overflow-hidden">
            {isDoctor ? (
              <DoctorRxPanel appointmentId={appointmentId} appt={appt} doctorRow={doctorRow} />
            ) : (
              <PatientRxPanel appointmentId={appointmentId} />
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

/* -------------------- Chat -------------------- */
function ChatPanel({ appointmentId }: { appointmentId: string }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("video_chat_messages")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true });
      if (!cancelled) setMsgs((data ?? []) as Msg[]);
    })();
    const ch = supabase
      .channel(`vcm-${appointmentId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "video_chat_messages", filter: `appointment_id=eq.${appointmentId}` },
        (payload) => setMsgs((m) => [...m, payload.new as Msg])
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [appointmentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !user) return;
    setText("");
    const { error } = await supabase.from("video_chat_messages").insert({
      appointment_id: appointmentId, sender_id: user.id, body,
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 px-3" ref={scrollRef as any}>
        <div className="space-y-2 py-3">
          {msgs.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">No messages yet — say hi 👋</div>
          )}
          {msgs.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.body}
                  <div className={`mt-0.5 text-[10px] opacity-70`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="flex gap-2 border-t p-2">
        <Input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…" />
        <Button onClick={send} size="icon"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

/* -------------------- Patient RX viewer -------------------- */
function PatientRxPanel({ appointmentId }: { appointmentId: string }) {
  const [rx, setRx] = useState<Rx[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("prescriptions").select("id,medicines,diagnosis,advice,created_at")
        .eq("appointment_id", appointmentId).order("created_at", { ascending: false });
      if (!cancelled) setRx((data ?? []) as Rx[]);
    })();
    const ch = supabase.channel(`rx-${appointmentId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "prescriptions", filter: `appointment_id=eq.${appointmentId}` },
        (payload) => {
          if (payload.eventType === "INSERT") setRx((r) => [payload.new as Rx, ...r]);
          if (payload.eventType === "UPDATE") setRx((r) => r.map((x) => x.id === (payload.new as Rx).id ? payload.new as Rx : x));
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [appointmentId]);

  return (
    <ScrollArea className="h-full px-3 py-3">
      {rx.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">Your doctor hasn't issued a prescription yet.</div>
      ) : (
        <div className="space-y-3">
          {rx.map((r) => (
            <Card key={r.id} className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <Badge className="gap-1"><FileSignature className="h-3 w-3" />Prescription</Badge>
                <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              {r.diagnosis && <div className="text-xs"><span className="font-semibold">Diagnosis:</span> {r.diagnosis}</div>}
              <div className="space-y-1">
                {(r.medicines ?? []).map((m, i) => (
                  <div key={i} className="rounded-md bg-muted px-2 py-1 text-xs">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-muted-foreground">{[m.dose, m.frequency, m.duration].filter(Boolean).join(" · ")}</div>
                  </div>
                ))}
              </div>
              {r.advice && <div className="text-xs"><span className="font-semibold">Advice:</span> {r.advice}</div>}
            </Card>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

/* -------------------- Doctor RX composer -------------------- */
function DoctorRxPanel({ appointmentId, appt, doctorRow }: { appointmentId: string; appt: any; doctorRow: any }) {
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [meds, setMeds] = useState<Medicine[]>([{ name: "", dose: "", frequency: "1-0-1", duration: "5 days" }]);
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<Rx[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("prescriptions").select("id,medicines,diagnosis,advice,created_at")
        .eq("appointment_id", appointmentId).order("created_at", { ascending: false });
      setIssued((data ?? []) as Rx[]);
    })();
  }, [appointmentId]);

  const updateMed = (i: number, key: keyof Medicine, value: string) =>
    setMeds((m) => m.map((x, idx) => (idx === i ? { ...x, [key]: value } : x)));

  const save = async () => {
    if (!appt || !doctorRow) return;
    const filtered = meds.filter((m) => m.name.trim());
    if (!filtered.length) return toast.error("Add at least one medicine");
    setSaving(true);
    const { data, error } = await supabase.from("prescriptions").insert({
      appointment_id: appt.id, doctor_id: doctorRow.id, patient_id: appt.patient_id,
      diagnosis: diagnosis || null, advice: advice || null, medicines: filtered as any,
    }).select("id,medicines,diagnosis,advice,created_at").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Sent to patient");
    setIssued((r) => [data as Rx, ...r]);
    setMeds([{ name: "", dose: "", frequency: "1-0-1", duration: "5 days" }]);
    setDiagnosis(""); setAdvice("");
  };

  return (
    <ScrollArea className="h-full px-3 py-3">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold">Diagnosis</label>
          <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g., Acute pharyngitis" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold">Medicines</label>
          {meds.map((m, i) => (
            <div key={i} className="space-y-1 rounded-md border p-2">
              <div className="flex items-center gap-1">
                <Input value={m.name} onChange={(e) => updateMed(i, "name", e.target.value)} placeholder="Medicine name" className="h-8" />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMeds((ms) => ms.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <Input value={m.dose ?? ""} onChange={(e) => updateMed(i, "dose", e.target.value)} placeholder="500mg" className="h-7 text-xs" />
                <Input value={m.frequency ?? ""} onChange={(e) => updateMed(i, "frequency", e.target.value)} placeholder="1-0-1" className="h-7 text-xs" />
                <Input value={m.duration ?? ""} onChange={(e) => updateMed(i, "duration", e.target.value)} placeholder="5 days" className="h-7 text-xs" />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setMeds((m) => [...m, { name: "", dose: "", frequency: "1-0-1", duration: "5 days" }])}>
            <Plus className="h-3.5 w-3.5" />Add medicine
          </Button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold">Advice</label>
          <Textarea value={advice} onChange={(e) => setAdvice(e.target.value)} rows={2} placeholder="Rest, hydration…" />
        </div>

        <Button onClick={save} disabled={saving} className="w-full gap-1.5 bg-gradient-primary">
          <FileSignature className="h-4 w-4" />{saving ? "Sending…" : "Send to patient"}
        </Button>

        {issued.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Issued this consult</div>
            {issued.map((r) => (
              <Card key={r.id} className="p-2 text-xs">
                <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</div>
                {(r.medicines ?? []).map((m, i) => <div key={i}>• {m.name} — {[m.dose, m.frequency, m.duration].filter(Boolean).join(" · ")}</div>)}
              </Card>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
