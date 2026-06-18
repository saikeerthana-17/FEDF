import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ appointmentId: z.string().uuid() });

/**
 * Mint (or return existing) Daily.co video room for an appointment.
 * Only the patient or the doctor on the appointment can call this.
 */
export const getOrCreateVideoRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Authorize: must be patient or doctor on appointment
    const { data: appt, error: aerr } = await supabase
      .from("appointments")
      .select("id, patient_id, doctor_id, scheduled_at, status")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (aerr || !appt) throw new Error("Appointment not found");

    const { data: doc } = await supabase
      .from("doctors").select("user_id").eq("id", appt.doctor_id).maybeSingle();
    const isPatient = appt.patient_id === userId;
    const isDoctor = doc?.user_id === userId;
    if (!isPatient && !isDoctor) throw new Error("Not authorized for this appointment");

    // Reuse existing room if still valid
    const { data: existing } = await supabase
      .from("video_sessions").select("*").eq("appointment_id", data.appointmentId).maybeSingle();
    if (existing && (!existing.expires_at || new Date(existing.expires_at) > new Date())) {
      return { room_url: existing.room_url, room_name: existing.room_name };
    }

    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) throw new Error("Video service not configured");

    const roomName = `medi-${data.appointmentId.slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`;
    const expSeconds = Math.floor(Date.now() / 1000) + 60 * 60 * 4; // 4 hours

    const resp = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: roomName,
        privacy: "public",
        properties: {
          exp: expSeconds,
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Daily.co error: ${resp.status} ${txt}`);
    }
    const room = (await resp.json()) as { name: string; url: string };

    // Upsert via admin to bypass RLS (writes are infrastructure-level)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("video_sessions").upsert({
      appointment_id: data.appointmentId,
      room_name: room.name,
      room_url: room.url,
      expires_at: new Date(expSeconds * 1000).toISOString(),
    }, { onConflict: "appointment_id" });

    return { room_url: room.url, room_name: room.name };
  });
