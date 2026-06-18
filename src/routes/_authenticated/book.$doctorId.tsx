import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Video, MapPin, CalendarX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, inr, doctorAvatarUrl } from "@/lib/format";
import { getAvailableSlots, type FreeSlot } from "@/lib/availability";

export const Route = createFileRoute("/_authenticated/book/$doctorId")({
  component: BookingPage,
});

function BookingPage() {
  const { doctorId } = useParams({ from: "/_authenticated/book/$doctorId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<FreeSlot | null>(null);
  const [mode, setMode] = useState<"video" | "in_person">("video");
  const [payTiming, setPayTiming] = useState<"now" | "at_clinic">("now");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: doctor } = useQuery<any>({
    queryKey: ["doctor", doctorId],
    queryFn: async () => (await (supabase as any).from("public_doctors").select("*").eq("id", doctorId).single()).data,
  });

  const { data: slots = [] } = useQuery({
    queryKey: ["slots", doctorId],
    queryFn: () => getAvailableSlots(doctorId),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, FreeSlot[]>();
    for (const s of slots) {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    return map;
  }, [slots]);

  const dates = Array.from(byDate.keys()).slice(0, 7);
  const currentDate = selectedDate ?? dates[0] ?? null;
  const daySlots = currentDate ? byDate.get(currentDate) ?? [] : [];

  const isPayAtClinic = mode === "in_person" && payTiming === "at_clinic";

  const handleBook = async () => {
    if (!doctor || !user || !selectedSlot) return;
    setLoading(true);

    const { data: appt, error: aErr } = await supabase.from("appointments").insert({
      patient_id: user.id,
      doctor_id: doctorId,
      scheduled_at: selectedSlot.scheduledAt,
      mode,
      reason,
      status: isPayAtClinic ? "confirmed" : "pending_payment",
    }).select().single();
    if (aErr || !appt) { setLoading(false); return toast.error(aErr?.message ?? "Booking failed"); }

    const { data: pay, error: pErr } = await supabase.from("payments").insert({
      appointment_id: appt.id,
      patient_id: user.id,
      doctor_id: doctorId,
      amount: doctor.consultation_fee,
      method: isPayAtClinic ? "cash" : "upi",
      status: "pending",
      upi_id: isPayAtClinic ? null : "8885719369@ptaxis",
    }).select().single();
    setLoading(false);
    if (pErr || !pay) return toast.error(pErr?.message ?? "Payment init failed");

    if (isPayAtClinic) {
      toast.success("Appointment confirmed. Pay at the clinic.");
      navigate({ to: "/appointments" });
      return;
    }
    navigate({ to: "/pay/$paymentId", params: { paymentId: pay.id } });
  };

  if (!doctor) return <div className="p-12 text-center text-muted-foreground">Loading doctor...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/doctors"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button></Link>
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit p-6">
          <Link to="/doctor/$doctorId" params={{ doctorId }} className="flex items-center gap-4 group">
            <Avatar className="h-16 w-16 ring-2 ring-primary/15">
              <AvatarImage src={doctorAvatarUrl(doctor.avatar_url)} alt={doctor.full_name} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">{initials(doctor.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold group-hover:underline">{doctor.full_name}</div>
              <div className="text-sm text-muted-foreground">{doctor.specialty}</div>
              {doctor.city && <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{doctor.city}</div>}
            </div>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">{doctor.bio}</p>
          <Link to="/doctor/$doctorId" params={{ doctorId }} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
            View full profile & reviews →
          </Link>
          <div className="mt-6 rounded-lg bg-muted p-4">
            <div className="text-xs text-muted-foreground">Consultation fee</div>
            <div className="text-2xl font-bold">{inr(Number(doctor.consultation_fee))}</div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-bold">Book appointment</h2>
          <div className="mt-4 space-y-5">
            <div>
              <div className="mb-2 text-sm font-medium">Consultation mode</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMode("video")} className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm ${mode === "video" ? "border-primary bg-primary/5 text-primary" : ""}`}>
                  <Video className="h-4 w-4" />Video
                </button>
                <button onClick={() => setMode("in_person")} className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm ${mode === "in_person" ? "border-primary bg-primary/5 text-primary" : ""}`}>
                  <MapPin className="h-4 w-4" />In-person
                </button>
              </div>
            </div>

            {dates.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <CalendarX className="h-4 w-4" />
                This doctor has no published availability yet. Please check back later.
              </div>
            ) : (
              <>
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-sm font-medium"><Calendar className="h-4 w-4" />Pick a day</div>
                  <div className="flex flex-wrap gap-2">
                    {dates.map((d) => {
                      const dt = new Date(d);
                      const active = currentDate === d;
                      return (
                        <button
                          key={d}
                          onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                          className={`min-w-[64px] rounded-md border px-2 py-2 text-center text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          <div className="font-medium">{dt.toLocaleDateString(undefined, { weekday: "short" })}</div>
                          <div className="text-base font-bold leading-tight">{dt.getDate()}</div>
                          <div className="opacity-70">{dt.toLocaleDateString(undefined, { month: "short" })}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Available slots</div>
                  <div className="grid grid-cols-4 gap-2">
                    {daySlots.map((s) => (
                      <button
                        key={s.scheduledAt}
                        onClick={() => setSelectedSlot(s)}
                        className={`rounded-md border px-2 py-2 text-xs font-medium transition ${selectedSlot?.scheduledAt === s.scheduledAt ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        {s.time}
                      </button>
                    ))}
                    {daySlots.length === 0 && <div className="col-span-4 text-xs text-muted-foreground">No slots on this day.</div>}
                  </div>
                </div>
              </>
            )}

            <div>
              <div className="mb-2 text-sm font-medium">Reason for visit (optional)</div>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe your symptoms..." rows={3} />
            </div>

            {mode === "in_person" ? (
              <div>
                <div className="mb-2 text-sm font-medium">Payment</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPayTiming("now")} className={`rounded-lg border p-3 text-left text-sm ${payTiming === "now" ? "border-primary bg-primary/5 text-primary" : ""}`}>
                    <div className="font-medium">Pay online now</div>
                    <div className="text-xs opacity-70">UPI / QR · instant confirm</div>
                  </button>
                  <button onClick={() => setPayTiming("at_clinic")} className={`rounded-lg border p-3 text-left text-sm ${payTiming === "at_clinic" ? "border-primary bg-primary/5 text-primary" : ""}`}>
                    <div className="font-medium">Pay at clinic</div>
                    <div className="text-xs opacity-70">Cash / card at visit</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                Online video consults require payment upfront to reserve your slot.
              </div>
            )}

            <Button onClick={handleBook} disabled={loading || !selectedSlot} size="lg" className="w-full bg-gradient-primary">
              {loading
                ? "Creating..."
                : !selectedSlot
                  ? "Select a slot"
                  : isPayAtClinic
                    ? "Confirm booking · Pay at clinic"
                    : `Proceed to pay ${inr(Number(doctor.consultation_fee))}`}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {isPayAtClinic
                ? "Your slot is reserved. Please pay at the clinic before consultation."
                : "Your booking is confirmed only after successful payment."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
