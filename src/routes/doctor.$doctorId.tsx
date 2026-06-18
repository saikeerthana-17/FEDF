import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Star, MapPin, GraduationCap, Languages, Calendar, ArrowRight, ArrowLeft, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, inr, doctorAvatarUrl } from "@/lib/format";

export const Route = createFileRoute("/doctor/$doctorId")({
  component: DoctorProfilePage,
  head: ({ params }) => ({
    meta: [
      { title: `Doctor Profile — MyMediCare` },
      { name: "description", content: `View doctor profile, qualifications, and patient reviews.` },
      { property: "og:title", content: `Doctor Profile — MyMediCare` },
      { property: "og:description", content: `Verified doctor profile with patient reviews on MyMediCare.` },
    ],
  }),
});

function Stars({ value, size = 4 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-${size} w-${size} ${i <= Math.round(value) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function DoctorProfilePage() {
  const { doctorId } = useParams({ from: "/doctor/$doctorId" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: doctor, isLoading } = useQuery<any>({
    queryKey: ["public-doctor", doctorId],
    queryFn: async () => (await (supabase as any).from("public_doctors").select("*").eq("id", doctorId).single()).data,
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["doctor-reviews", doctorId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("doctor_reviews")
        .select("id, patient_id, rating, comment, created_at")
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: canReview } = useQuery({
    queryKey: ["can-review", doctorId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", user!.id)
        .eq("doctor_id", doctorId)
        .in("status", ["completed", "confirmed"]);
      return (count ?? 0) > 0;
    },
  });

  const myReview = reviews.find((r) => r.patient_id === user?.id);

  const submit = async () => {
    if (!user) return toast.error("Please sign in to leave a review");
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from("doctor_reviews")
      .upsert(
        { doctor_id: doctorId, patient_id: user.id, rating, comment: comment.trim() || null },
        { onConflict: "doctor_id,patient_id" },
      );
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Review posted");
    setComment("");
    qc.invalidateQueries({ queryKey: ["doctor-reviews", doctorId] });
  };

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : Number(doctor?.rating ?? 0);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (!doctor) return <div className="p-12 text-center text-muted-foreground">Doctor not found.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <Link to="/doctors">
        <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />All doctors</Button>
      </Link>

      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-primary" />
        <div className="-mt-12 px-6 pb-6">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <Avatar className="h-28 w-28 ring-4 ring-background">
                <AvatarImage src={doctorAvatarUrl(doctor.avatar_url)} alt={doctor.full_name} />
                <AvatarFallback className="bg-gradient-primary text-2xl font-semibold text-primary-foreground">
                  {initials(doctor.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="pb-2">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold md:text-3xl">{doctor.full_name}</h1>
                  {doctor.is_verified && (
                    <BadgeCheck className="h-6 w-6 text-primary" aria-label="Verified" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{doctor.specialty}</div>
                <div className="mt-1 flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1"><Stars value={avg} /> <span className="font-medium">{avg.toFixed(1)}</span></span>
                  <span className="text-muted-foreground">· {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
                  <span className="text-muted-foreground">· {doctor.experience_years} yrs exp</span>
                </div>
              </div>
            </div>
            <Link to="/book/$doctorId" params={{ doctorId: doctor.id }}>
              <Button size="lg" className="bg-gradient-primary">
                <Calendar className="mr-2 h-4 w-4" />Book — {inr(Number(doctor.consultation_fee))}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <Card className="space-y-5 p-6">
          <section>
            <h2 className="font-display text-lg font-semibold">About</h2>
            <p className="mt-2 text-sm text-muted-foreground">{doctor.bio || "No bio yet."}</p>
          </section>
          <section className="grid gap-3 sm:grid-cols-2">
            {doctor.qualifications && (
              <div className="flex items-start gap-2 text-sm">
                <GraduationCap className="mt-0.5 h-4 w-4 text-primary" />
                <div><div className="font-medium">Qualifications</div><div className="text-muted-foreground">{doctor.qualifications}</div></div>
              </div>
            )}
            {doctor.medical_school && (
              <div className="flex items-start gap-2 text-sm">
                <GraduationCap className="mt-0.5 h-4 w-4 text-primary" />
                <div><div className="font-medium">Medical school</div><div className="text-muted-foreground">{doctor.medical_school}{doctor.graduation_year ? ` · ${doctor.graduation_year}` : ""}</div></div>
              </div>
            )}
            {doctor.languages && (
              <div className="flex items-start gap-2 text-sm">
                <Languages className="mt-0.5 h-4 w-4 text-primary" />
                <div><div className="font-medium">Languages</div><div className="text-muted-foreground">{doctor.languages}</div></div>
              </div>
            )}
            {doctor.city && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <div><div className="font-medium">City</div><div className="text-muted-foreground">{doctor.city}</div></div>
              </div>
            )}
          </section>
        </Card>

        <Card className="space-y-4 p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Patient reviews</h2>
            <Badge variant="secondary">{reviews.length}</Badge>
          </div>

          {canReview && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-sm font-medium">{myReview ? "Update your review" : "Share your experience"}</div>
              <div className="mt-2 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} star`}>
                    <Star className={`h-5 w-5 ${i <= rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
                  </button>
                ))}
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was your consultation?"
                rows={3}
                className="mt-2"
              />
              <Button onClick={submit} disabled={submitting} size="sm" className="mt-2 w-full">
                {submitting ? "Posting…" : myReview ? "Update review" : "Post review"}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {reviews.length === 0 && <div className="text-sm text-muted-foreground">No reviews yet.</div>}
            {reviews.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Stars value={r.rating} />
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
