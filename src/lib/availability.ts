import { supabase } from "@/integrations/supabase/client";

export interface FreeSlot {
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM
  scheduledAt: string;   // ISO
}

/**
 * Compute available slots for a doctor over the next `days` days.
 * Uses doctor_availability (weekly), doctor_leaves (date blocks)
 * and existing appointments (slot collisions).
 */
export async function getAvailableSlots(doctorId: string, days = 14): Promise<FreeSlot[]> {
  const [{ data: avail }, { data: leaves }, { data: appts }] = await Promise.all([
    supabase.from("doctor_availability").select("*").eq("doctor_id", doctorId),
    supabase.from("doctor_leaves").select("leave_date").eq("doctor_id", doctorId),
    supabase
      .from("appointments")
      .select("scheduled_at, duration_min")
      .eq("doctor_id", doctorId)
      .gte("scheduled_at", new Date().toISOString())
      .neq("status", "cancelled" as any),
  ]);

  const leaveSet = new Set((leaves ?? []).map((l) => l.leave_date));
  const taken = new Set(
    (appts ?? []).map((a) => new Date(a.scheduled_at).toISOString()),
  );

  const out: FreeSlot[] = [];
  const today = new Date();
  today.setSeconds(0, 0);

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();
    const ymd = d.toISOString().slice(0, 10);
    if (leaveSet.has(ymd)) continue;

    const row = (avail ?? []).find((a) => a.day_of_week === dow);
    if (!row) continue;

    const [sh, sm] = row.start_time.split(":").map(Number);
    const [eh, em] = row.end_time.split(":").map(Number);
    const step = row.slot_minutes ?? 30;

    const cur = new Date(d);
    cur.setHours(sh, sm, 0, 0);
    const end = new Date(d);
    end.setHours(eh, em, 0, 0);

    while (cur < end) {
      if (cur > new Date()) {
        const iso = cur.toISOString();
        if (!taken.has(iso)) {
          out.push({
            date: ymd,
            time: cur.toTimeString().slice(0, 5),
            scheduledAt: iso,
          });
        }
      }
      cur.setMinutes(cur.getMinutes() + step);
    }
  }
  return out;
}
