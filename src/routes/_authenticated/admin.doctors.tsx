import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { initials } from "@/lib/format";
import { CheckCircle2, XCircle, Eye, FileText, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/doctors")({
  component: AdminDoctorsPage,
});

const DOC_LABELS: Record<string, string> = {
  id_proof_url: "Government ID proof",
  medical_degree_url: "Medical degree (MBBS)",
  registration_certificate_url: "Council registration certificate",
  experience_certificate_url: "Experience certificate",
};

function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "verified" | "all">("pending");

  const load = async () => {
    const { data } = await supabase.from("doctors").select("*").order("created_at", { ascending: false });
    setDoctors(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const setVerified = async (id: string, val: boolean) => {
    const { error } = await supabase.rpc("verify_doctor", { _doctor_id: id, _verified: val });
    if (error) return toast.error(error.message);
    await supabase.from("doctors").update({ application_status: val ? "approved" : "rejected" }).eq("id", id);
    toast.success(val ? "Doctor verified & granted access" : "Verification revoked");
    load();
  };

  const filtered = doctors.filter((d) =>
    filter === "all" ? true : filter === "verified" ? d.is_verified : !d.is_verified,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Doctor Verification</h1>
          <p className="text-sm text-muted-foreground">Review credentials, documents and approve applications.</p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {(["pending", "verified", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={"rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors " +
                (filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {f} {f !== "all" && `(${doctors.filter((d) => f === "verified" ? d.is_verified : !d.is_verified).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">No applications in this view.</CardContent></Card>
        )}
        {filtered.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={d.avatar_url} />
                <AvatarFallback>{initials(d.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium truncate">{d.full_name}</div>
                  {d.is_verified ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700">Verified</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {d.specialty} · {d.experience_years}y · {d.registration_council || "—"} · ₹{d.consultation_fee}
                </div>
              </div>
              <DoctorReviewDialog doctor={d} />
              {d.is_verified ? (
                <Button variant="outline" size="sm" onClick={() => setVerified(d.id, false)}>
                  <XCircle className="mr-1 h-4 w-4" />Revoke
                </Button>
              ) : (
                <Button size="sm" onClick={() => setVerified(d.id, true)}>
                  <CheckCircle2 className="mr-1 h-4 w-4" />Approve
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DoctorReviewDialog({ doctor: d }: { doctor: any }) {
  const [signedDocs, setSignedDocs] = useState<{ label: string; url: string }[]>([]);
  const [open, setOpen] = useState(false);

  const loadDocs = async () => {
    const docs: { label: string; url: string }[] = [];
    for (const key of Object.keys(DOC_LABELS)) {
      const path = d[key];
      if (!path) continue;
      const { data } = await supabase.storage.from("doctor-documents").createSignedUrl(path, 3600);
      if (data?.signedUrl) docs.push({ label: DOC_LABELS[key], url: data.signedUrl });
    }
    setSignedDocs(docs);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadDocs(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><Eye className="mr-1 h-4 w-4" />Review</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{d.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <Section title="Personal">
            <Row k="Age" v={d.age} /><Row k="Gender" v={d.gender} />
            <Row k="Phone" v={d.phone} /><Row k="Alt phone" v={d.alt_phone} />
            <Row k="City" v={d.city} /><Row k="Languages" v={d.languages} />
            <Row k="Clinic address" v={d.clinic_address} full />
          </Section>
          <Section title="Education & registration">
            <Row k="Specialty" v={d.specialty} />
            <Row k="Experience" v={d.experience_years ? `${d.experience_years} years` : null} />
            <Row k="Medical school" v={d.medical_school} />
            <Row k="Graduation year" v={d.graduation_year} />
            <Row k="Qualifications" v={d.qualifications} full />
            <Row k="Council" v={d.registration_council} />
            <Row k="Registration #" v={d.registration_number} />
          </Section>
          <Section title="Professional">
            <Row k="Consultation fee" v={d.consultation_fee ? `₹${d.consultation_fee}` : null} />
            <Row k="Previous hospitals" v={d.previous_hospitals} full />
            <Row k="Achievements" v={d.achievements} full />
            <Row k="Bio" v={d.bio} full />
          </Section>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documents</div>
            {signedDocs.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">No documents uploaded</div>
            ) : (
              <div className="space-y-2">
                {signedDocs.map((doc) => (
                  <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-sm font-medium">{doc.label}</div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/30 p-3">{children}</div>
    </div>
  );
}
function Row({ k, v, full }: { k: string; v: any; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="text-sm">{v || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}
