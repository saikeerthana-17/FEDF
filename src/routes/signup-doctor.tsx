import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Mail, Lock, User as UserIcon, Phone, MapPin, GraduationCap,
  Award, Stethoscope, FileText, Upload, ArrowRight, ArrowLeft,
  ShieldCheck, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import logo from "@/assets/medicare-logo.png";

export const Route = createFileRoute("/signup-doctor")({
  head: () => ({ meta: [{ title: "Apply as a Doctor — MediCare+" }] }),
  component: SignupDoctorPage,
});

type DocFiles = {
  profile_photo: File | null;
  id_proof: File | null;
  medical_degree: File | null;
  registration_certificate: File | null;
  experience_certificate: File | null;
};

function SignupDoctorPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [account, setAccount] = useState({ email: "", password: "" });
  const [personal, setPersonal] = useState({
    full_name: "", age: 30, gender: "Male", phone: "", alt_phone: "",
    city: "", clinic_address: "", languages: "English, Hindi",
  });
  const [edu, setEdu] = useState({
    medical_school: "", graduation_year: new Date().getFullYear() - 5,
    qualifications: "", specialty: "", experience_years: 1,
    registration_number: "", registration_council: "",
  });
  const [pro, setPro] = useState({
    consultation_fee: 500, previous_hospitals: "", achievements: "", bio: "",
  });
  const [files, setFiles] = useState<DocFiles>({
    profile_photo: null, id_proof: null, medical_degree: null,
    registration_certificate: null, experience_certificate: null,
  });

  const progress = (step / 5) * 100;

  const next = () => setStep((s) => Math.min(s + 1, 5));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!account.email || account.password.length < 8) return "Enter a valid email and password (min 8 chars).";
    }
    if (step === 2) {
      if (!personal.full_name || !personal.phone) return "Full name and phone are required.";
    }
    if (step === 3) {
      if (!edu.specialty || !edu.medical_school || !edu.registration_number || !edu.registration_council)
        return "Specialty, medical school, registration number and council are required.";
    }
    if (step === 4) {
      if (!files.profile_photo) return "A clear profile photo is required so patients can recognize you.";
      if (!files.id_proof || !files.medical_degree || !files.registration_certificate)
        return "ID proof, medical degree and registration certificate are required.";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) return toast.error(err);
    next();
  };

  const uploadOne = async (uid: string, key: keyof DocFiles, f: File) => {
    const path = `${uid}/${key}-${Date.now()}-${f.name.replace(/\s+/g, "_")}`;
    const { error } = await supabase.storage.from("doctor-documents").upload(path, f, { upsert: false });
    if (error) throw error;
    return path;
  };

  const uploadAvatar = async (uid: string, f: File) => {
    const path = `${uid}/avatar-${Date.now()}-${f.name.replace(/\s+/g, "_")}`;
    const { error } = await supabase.storage.from("doctor-avatars").upload(path, f, { upsert: true });
    if (error) throw error;
    return path;
  };


  const submit = async () => {
    const err = validateStep();
    if (err) return toast.error(err);

    setLoading(true);
    try {
      const { data: auth, error: signErr } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard",
          data: { full_name: personal.full_name },
        },
      });
      if (signErr) throw signErr;

      const uid = auth.user?.id;
      if (!uid) throw new Error("Account created but no session yet. Please verify your email and sign in.");

      // Wait briefly for session to be ready before storage upload
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Try to sign in (in case email confirmation isn't required)
        await supabase.auth.signInWithPassword({
          email: account.email, password: account.password,
        });
      }

      const paths: Record<string, string | null> = {
        id_proof_url: null, medical_degree_url: null,
        registration_certificate_url: null, experience_certificate_url: null,
        avatar_url: null,
      };
      if (files.profile_photo) paths.avatar_url = await uploadAvatar(uid, files.profile_photo);
      if (files.id_proof) paths.id_proof_url = await uploadOne(uid, "id_proof", files.id_proof);
      if (files.medical_degree) paths.medical_degree_url = await uploadOne(uid, "medical_degree", files.medical_degree);
      if (files.registration_certificate)
        paths.registration_certificate_url = await uploadOne(uid, "registration_certificate", files.registration_certificate);
      if (files.experience_certificate)
        paths.experience_certificate_url = await uploadOne(uid, "experience_certificate", files.experience_certificate);

      const { error: insErr } = await supabase.from("doctors").insert({
        user_id: uid,
        full_name: personal.full_name,
        age: personal.age,
        gender: personal.gender,
        phone: personal.phone,
        alt_phone: personal.alt_phone || null,
        city: personal.city || null,
        clinic_address: personal.clinic_address || null,
        languages: personal.languages || null,
        medical_school: edu.medical_school,
        graduation_year: edu.graduation_year,
        qualifications: edu.qualifications || null,
        specialty: edu.specialty,
        experience_years: edu.experience_years,
        registration_number: edu.registration_number,
        registration_council: edu.registration_council,
        consultation_fee: pro.consultation_fee,
        previous_hospitals: pro.previous_hospitals || null,
        achievements: pro.achievements || null,
        bio: pro.bio || null,
        is_verified: false,
        application_status: "pending",
        ...paths,
      });
      if (insErr) throw insErr;

      setStep(6);
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.2fr]">
      {/* Left rail */}
      <div className="hidden bg-gradient-primary p-12 md:flex md:flex-col md:justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 p-1">
            <img src={logo} alt="MediCare" className="h-full w-full object-contain" />
          </div>
          <span className="font-display text-lg font-bold">MediCare+</span>
        </Link>
        <div className="space-y-6 text-primary-foreground">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Practice with India's most trusted telehealth network.
          </h2>
          <ul className="space-y-3 text-sm text-primary-foreground/85">
            {[
              "Verified credentials, verified trust",
              "Flexible schedule across video, audio & in-clinic",
              "Instant UPI payouts, transparent ledger",
              "Patient records, e-prescriptions, analytics built-in",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-xs text-primary-foreground/60">
          Your documents are encrypted and reviewed only by our medical board.
        </div>
      </div>

      {/* Form */}
      <div className="flex items-start justify-center overflow-y-auto p-6 md:p-12">
        <Card className="w-full max-w-2xl p-8 shadow-elevated">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {step === 6 ? "Application submitted" : "Doctor application"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {step === 6 ? "Our medical board will review your credentials." : `Step ${step} of 5 — takes about 5 minutes`}
              </p>
            </div>
          </div>

          {step !== 6 && <Progress value={progress} className="mb-6 h-1.5" />}

          {step === 1 && (
            <div className="space-y-4">
              <Field icon={Mail} label="Work email" value={account.email}
                onChange={(v) => setAccount({ ...account, email: v })} type="email" placeholder="dr.you@hospital.com" />
              <Field icon={Lock} label="Create password" value={account.password}
                onChange={(v) => setAccount({ ...account, password: v })} type="password" placeholder="Min 8 characters" />
              <p className="text-xs text-muted-foreground">
                You'll use this account to manage appointments after verification.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field icon={UserIcon} label="Full legal name" wrap value={personal.full_name}
                onChange={(v) => setPersonal({ ...personal, full_name: v })} placeholder="Dr. Jane Doe" />
              <Field label="Age" type="number" value={String(personal.age)}
                onChange={(v) => setPersonal({ ...personal, age: Number(v) })} />
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={personal.gender} onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}>
                  <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                </select>
              </div>
              <Field icon={Phone} label="Primary phone" value={personal.phone}
                onChange={(v) => setPersonal({ ...personal, phone: v })} placeholder="+91 98765 43210" />
              <Field icon={Phone} label="Alternate phone (optional)" value={personal.alt_phone}
                onChange={(v) => setPersonal({ ...personal, alt_phone: v })} />
              <Field icon={MapPin} label="City of practice" value={personal.city}
                onChange={(v) => setPersonal({ ...personal, city: v })} placeholder="Bengaluru" />
              <div className="space-y-1.5 md:col-span-2">
                <Label>Clinic / hospital address</Label>
                <Textarea rows={2} value={personal.clinic_address}
                  onChange={(e) => setPersonal({ ...personal, clinic_address: e.target.value })}
                  placeholder="Apollo Clinic, MG Road, Bengaluru 560001" />
              </div>
              <Field label="Languages spoken" wrap value={personal.languages}
                onChange={(v) => setPersonal({ ...personal, languages: v })} placeholder="English, Hindi, Kannada" />
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field icon={Stethoscope} label="Primary specialty" wrap value={edu.specialty}
                onChange={(v) => setEdu({ ...edu, specialty: v })} placeholder="Cardiology" />
              <Field label="Years of experience" type="number" value={String(edu.experience_years)}
                onChange={(v) => setEdu({ ...edu, experience_years: Number(v) })} />
              <Field icon={GraduationCap} label="Medical school / university" wrap value={edu.medical_school}
                onChange={(v) => setEdu({ ...edu, medical_school: v })} placeholder="AIIMS, New Delhi" />
              <Field label="Graduation year" type="number" value={String(edu.graduation_year)}
                onChange={(v) => setEdu({ ...edu, graduation_year: Number(v) })} />
              <Field icon={Award} label="Qualifications" wrap value={edu.qualifications}
                onChange={(v) => setEdu({ ...edu, qualifications: v })} placeholder="MBBS, MD (Internal Medicine), DM" />
              <Field label="Medical council" value={edu.registration_council}
                onChange={(v) => setEdu({ ...edu, registration_council: v })} placeholder="Karnataka Medical Council" />
              <Field label="Registration / NMC number" wrap value={edu.registration_number}
                onChange={(v) => setEdu({ ...edu, registration_number: v })} placeholder="KMC-12345" />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a profile photo and your verification documents. Your photo is shown to patients; documents are private and reviewed only by our team.
              </p>
              <PhotoField file={files.profile_photo} onChange={(f) => setFiles({ ...files, profile_photo: f })} />
              
              <FileField label="Government ID proof (Aadhaar / Passport / PAN)" required
                file={files.id_proof} onChange={(f) => setFiles({ ...files, id_proof: f })} />
              <FileField label="Medical degree certificate (MBBS)" required
                file={files.medical_degree} onChange={(f) => setFiles({ ...files, medical_degree: f })} />
              <FileField label="Medical council registration certificate" required
                file={files.registration_certificate} onChange={(f) => setFiles({ ...files, registration_certificate: f })} />
              <FileField label="Experience / employment certificate (optional)"
                file={files.experience_certificate} onChange={(f) => setFiles({ ...files, experience_certificate: f })} />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <Field label="Consultation fee (₹)" type="number" value={String(pro.consultation_fee)}
                onChange={(v) => setPro({ ...pro, consultation_fee: Number(v) })} />
              <div className="space-y-1.5">
                <Label>Previous hospitals / clinics</Label>
                <Textarea rows={3} value={pro.previous_hospitals}
                  onChange={(e) => setPro({ ...pro, previous_hospitals: e.target.value })}
                  placeholder="Manipal Hospital (2018–2022), Fortis (2022–present)" />
              </div>
              <div className="space-y-1.5">
                <Label>Awards & achievements (optional)</Label>
                <Textarea rows={2} value={pro.achievements}
                  onChange={(e) => setPro({ ...pro, achievements: e.target.value })}
                  placeholder="Published in Lancet 2023, Best Resident Award AIIMS 2019" />
              </div>
              <div className="space-y-1.5">
                <Label>Short bio for patients</Label>
                <Textarea rows={4} value={pro.bio}
                  onChange={(e) => setPro({ ...pro, bio: e.target.value })}
                  placeholder="I focus on preventive cardiology and have treated over 8,000 patients..." />
              </div>
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-xs text-muted-foreground">
                <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Verification timeline
                </div>
                Most applications are reviewed within 24–48 hours. You'll receive an email once approved and gain access to the doctor workspace.
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">Thank you, {personal.full_name}!</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your application and documents are with our medical board.
                  We'll email <span className="font-medium text-foreground">{account.email}</span> within 24–48 hours.
                </p>
              </div>
              <Button onClick={() => navigate({ to: "/login" })} className="bg-gradient-primary">
                Go to sign in <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step !== 6 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={back} disabled={step === 1 || loading}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              {step < 5 ? (
                <Button onClick={handleNext} className="bg-gradient-primary">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={loading} className="bg-gradient-primary">
                  {loading ? "Submitting..." : <>Submit application <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              )}
            </div>
          )}

          {step === 1 && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Not a doctor? <Link to="/signup" className="font-medium text-primary hover:underline">Sign up as patient</Link>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({
  icon: Icon, label, value, onChange, type = "text", placeholder, wrap,
}: {
  icon?: any; label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; wrap?: boolean;
}) {
  return (
    <div className={"space-y-1.5 " + (wrap ? "md:col-span-2" : "")}>
      <Label>{label}</Label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
        <Input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} className={Icon ? "pl-9" : ""} />
      </div>
    </div>
  );
}

function FileField({
  label, file, onChange, required,
}: { label: string; file: File | null; onChange: (f: File | null) => void; required?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 transition-colors hover:bg-muted/60">
      <div className={"flex h-10 w-10 items-center justify-center rounded-lg " + (file ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary")}>
        {file ? <CheckCircle2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {file ? file.name : "Click to upload PDF, JPG or PNG"}
        </div>
      </div>
      <FileText className="h-4 w-4 text-muted-foreground" />
      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
}

function PhotoField({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-primary-foreground ring-2 ring-primary/20">
        {preview ? (
          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <UserIcon className="h-7 w-7" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold">Profile photo <span className="text-destructive">*</span></div>
        <div className="text-xs text-muted-foreground">
          {file ? file.name : "Square JPG or PNG, at least 400×400. This will be shown to patients."}
        </div>
      </div>
      <Upload className="h-4 w-4 text-primary" />
      <input type="file" accept="image/jpeg,image/png" className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
}
