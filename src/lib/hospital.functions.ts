import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `h-${Math.random().toString(36).slice(2, 8)}`;

const HospitalInput = z.object({
  name: z.string().min(2).max(200),
  hospital_type: z.string().min(2).max(50),
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  website: z.string().url().max(300).optional(),
});

export const applyAsHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => HospitalInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // One hospital per owner for now
    const { data: existing } = await supabase.from("hospitals").select("id").eq("owner_user_id", userId).maybeSingle();
    if (existing) throw new Error("You already have a hospital application");

    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let i = 1;
    while (true) {
      const { data: hit } = await supabase.from("hospitals").select("id").eq("slug", slug).maybeSingle();
      if (!hit) break;
      slug = `${baseSlug}-${++i}`;
      if (i > 20) { slug = `${baseSlug}-${Date.now()}`; break; }
    }

    const { data: hospital, error } = await supabase.from("hospitals").insert({
      owner_user_id: userId,
      name: data.name,
      slug,
      hospital_type: data.hospital_type,
      description: data.description ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      pincode: data.pincode ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      application_status: "pending",
    }).select().single();
    if (error) throw new Error(error.message);

    // Grant hospital role via admin client (RLS would block self-grant)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "hospital" }).select();

    return { hospital };
  });
