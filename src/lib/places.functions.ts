import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.enum(["pharmacy", "hospital"]),
  radius: z.number().min(500).max(20000).default(5000),
  openNow: z.boolean().optional(),
});

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  openNow: boolean | null;
  phone: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
}

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const searchNearbyPlaces = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<{ places: NearbyPlace[]; error: string | null }> => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_API_KEY) return { places: [], error: "LOVABLE_API_KEY is not configured" };
    if (!GOOGLE_MAPS_API_KEY) return { places: [], error: "Google Maps connector is not connected" };

    try {
      const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri",
        },
        body: JSON.stringify({
          includedTypes: [data.type],
          maxResultCount: 20,
          rankPreference: "DISTANCE",
          locationRestriction: {
            circle: {
              center: { latitude: data.lat, longitude: data.lng },
              radius: data.radius,
            },
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Places API error [${res.status}]: ${text}`);
        return { places: [], error: `Google Places error (${res.status})` };
      }

      const json = (await res.json()) as { places?: Array<Record<string, unknown>> };
      const places: NearbyPlace[] = (json.places ?? []).map((p) => {
        const loc = (p.location as { latitude?: number; longitude?: number } | undefined) ?? {};
        const display = (p.displayName as { text?: string } | undefined) ?? {};
        const hours = (p.currentOpeningHours as { openNow?: boolean } | undefined) ?? {};
        return {
          id: String(p.id ?? ""),
          name: display.text ?? "Unknown",
          address: (p.formattedAddress as string) ?? "",
          lat: loc.latitude ?? 0,
          lng: loc.longitude ?? 0,
          rating: (p.rating as number) ?? null,
          userRatingCount: (p.userRatingCount as number) ?? null,
          openNow: hours.openNow ?? null,
          phone: ((p.nationalPhoneNumber as string) ?? (p.internationalPhoneNumber as string)) || null,
          websiteUri: (p.websiteUri as string) ?? null,
          googleMapsUri: (p.googleMapsUri as string) ?? null,
        };
      });
      return { places, error: null };
    } catch (err) {
      console.error("searchNearbyPlaces failed:", err);
      return { places: [], error: "Nearby search is currently unavailable" };
    }
  });
