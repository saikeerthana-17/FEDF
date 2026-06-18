
## Goals

1. Remove Pharmacy from patient/main dashboard navigation and quick actions.
2. Rebuild ambulance booking as an **Uber-style live map experience** with vehicle photos, types, ETA, fare, driver details.
3. Give doctors full patient context on booked appointments: past prescriptions, vitals, allergies, chronic conditions, history.
4. Rebuild patient **Nearby** page to a billion-dollar feel (hospitals, pharmacies, clinics on a Google Map with rich cards).

---

## 1. Remove Pharmacy from dashboard

- `src/components/layout/AppShell.tsx` — remove "Pharmacy" item from patient sidebar/bottom nav.
- `src/routes/_authenticated/dashboard.tsx` — remove the Pharmacy quick-action card / tile.
- Keep the route file (`pharmacy.tsx`) accessible by direct URL so nothing 404s, but unlinked from primary nav. (If you prefer fully deleting, say so.)

## 2. Uber-style Ambulance Booking

Rebuild `src/routes/_authenticated/book-ambulance.tsx` into a full-screen map experience.

**Layout** (mobile-first, splits into map + bottom sheet on desktop):
- **Top**: pickup + drop search bar with Google Places (New) autocomplete.
- **Map (Google Maps JS)**: 
  - Centered on user's live location (blue dot).
  - Animated ambulance markers (custom SVG icons by type) for nearby available units pulled from `ambulances` + `ambulance_locations`.
  - Route polyline from pickup → drop once both set (Routes API via gateway).
- **Bottom sheet** (Uber-style vehicle picker, horizontally scrollable cards):
  - One card per ambulance type: **Basic / ALS / ICU / Neonatal**.
  - Each card shows: photo of the vehicle, type name, equipment summary, capacity, ETA to pickup (min nearest unit distance ÷ avg speed), fare estimate, "X nearby" count.
  - Selected card highlighted; "Confirm Booking" CTA.
- After confirm: bottom sheet morphs into **tracking view** with assigned driver photo, name, vehicle number, live ETA, call/SMS buttons, map showing ambulance moving toward pickup. (Reuses existing track route or inlines it.)

**New assets**:
- Generate 4 ambulance photos via `imagegen` → `src/assets/ambulance-basic.jpg`, `-als.jpg`, `-icu.jpg`, `-neonatal.jpg`.
- Custom SVG marker icons for each ambulance type on the map.

**Data**:
- Reuse existing `createAmbulanceBooking` server fn.
- Query `ambulances` joined with latest `ambulance_locations` to populate nearby markers; filter by `status = 'available'`.
- Compute per-type ETA/count client-side using `haversineKm`.

## 3. Doctor patient context on appointments

Update `src/routes/_authenticated/doctor.dashboard.tsx` and create/extend `src/routes/_authenticated/doctor.patient.$patientId.tsx` (new) — accessible by clicking a booked appointment.

**Patient context drawer/page shows**:
- Profile header: name, age, gender, blood group, phone, avatar.
- **Health snapshot**: chronic conditions, allergies, emergency contact (from `profiles`).
- **Past prescriptions** list (from `prescriptions` where `patient_id = X`): collapsible cards with date, diagnosis, medicines, advice.
- **Vitals timeline** (from `vitals`): latest BP, HR, SpO2, temp, weight; mini sparkline trend.
- **Appointment history** with this and other doctors.
- Quick action: "Write new prescription" → existing `doctor.prescribe.$appointmentId` route.

RLS already permits: `profiles self read` policy includes doctors of the patient's appointments; `prescriptions` and `vitals` both allow doctor reads. No migration needed.

In the appointment list on the doctor dashboard, each row gets a "View patient" button that opens this view.

## 4. Patient Nearby — billion-dollar redesign

Rebuild `src/routes/_authenticated/nearby.tsx`:
- Split layout: large Google Map left, results rail right (stacks on mobile).
- Category chips: **Hospitals / Pharmacies / Clinics / Labs / 24×7** (Places API New `searchNearby` via gateway).
- Each map pin colored by category; selected pin shows a glassmorphic info card with photo, rating, distance, open status, directions/call buttons.
- Results rail: rich cards with cover photo (Places photo endpoint), star rating, distance, ETA, "Open now" badge, gradient hover.
- Top bar: address search (Places autocomplete) to recenter.
- Subtle motion via framer-motion on card mount + selection.

---

## Files

**Modify**: `src/components/layout/AppShell.tsx`, `src/routes/_authenticated/dashboard.tsx`, `src/routes/_authenticated/book-ambulance.tsx`, `src/routes/_authenticated/doctor.dashboard.tsx`, `src/routes/_authenticated/nearby.tsx`.

**Create**: `src/routes/_authenticated/doctor.patient.$patientId.tsx`, `src/components/ambulance/VehiclePickerCard.tsx`, `src/components/ambulance/AmbulanceMap.tsx`, `src/components/nearby/NearbyMap.tsx`, `src/lib/places.functions.ts` additions for `nearbySearch`, 4 ambulance image assets in `src/assets/`.

**No DB migrations needed** — existing schema and RLS already support all reads.

## Technical notes

- Google Maps JS loaded via existing `loadGoogleMaps()` helper; markers use `google.maps.Marker` (not AdvancedMarkerElement).
- Places API (New) and Routes API called server-side through the connector gateway (`places.functions.ts`).
- Live ambulance locations: poll every 5s (or Supabase realtime on `ambulance_locations` if cheap).
