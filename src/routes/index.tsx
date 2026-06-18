import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Stethoscope, ShieldCheck, Clock, Sparkles, Video, CreditCard,
  ArrowRight, Activity, Star, CheckCircle2, Ambulance, Pill,
  Hospital, HeartPulse, Phone, MapPin, Zap, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PublicNav } from "@/components/layout/PublicNav";
import { supabase } from "@/integrations/supabase/client";
import { initials, inr, doctorAvatarUrl } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediCare+ — India's most loved healthcare platform" },
      { name: "description", content: "Book verified doctors in 30 seconds, hail an ambulance in one tap, order prescriptions, and consult by HD video. One app. All of healthcare." },
      { property: "og:title", content: "MediCare+ — Healthcare, instantly" },
      { property: "og:description", content: "Verified doctors. UPI checkout. Live ambulance tracking. ICU bed availability. 24×7." },
    ],
  }),
  component: Landing,
});

const services = [
  { icon: Video, title: "Video consults", desc: "HD secure rooms with e-prescription.", to: "/signup" as const, color: "from-blue-500 to-indigo-600" },
  { icon: Ambulance, title: "Ambulance in 1 tap", desc: "Live GPS tracking, instant ETA.", to: "/signup" as const, color: "from-rose-500 to-red-600" },
  { icon: Pill, title: "Pharmacy delivery", desc: "Upload Rx, get meds in 60 min.", to: "/signup" as const, color: "from-emerald-500 to-teal-600" },
  { icon: Hospital, title: "ICU bed finder", desc: "Real-time hospital bed availability.", to: "/signup" as const, color: "from-amber-500 to-orange-600" },
];

const stats = [
  { value: "120k+", label: "Patients served" },
  { value: "1,800+", label: "Verified doctors" },
  { value: "₹42 Cr", label: "Payments processed" },
  { value: "4.9★", label: "App store rating" },
];

const testimonials = [
  { name: "Aarav K.", role: "Patient · Mumbai", body: "Got a cardio consult in 12 minutes. The Rx hit my pharmacy app instantly. This is the future." },
  { name: "Dr. Riya N.", role: "Pediatrician", body: "Best workspace I've used. Templates, video, payouts — finally one tool that respects a doctor's time." },
  { name: "Manipal Hospital", role: "Branch admin", body: "Live ICU & ER bed sync across 9 branches changed how we triage. Onboarding took an afternoon." },
];

function Landing() {
  const { data: topDoctors = [] } = useQuery<any[]>({
    queryKey: ["landing-doctors"],
    queryFn: async () => (await (supabase as any).from("public_doctors").select("*").eq("is_verified", true).order("rating", { ascending: false }).limit(6)).data ?? [],
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* HERO ============================================================ */}
      <section className="relative overflow-hidden">
        {/* aurora bg */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-32 h-[36rem] w-[36rem] rounded-full bg-primary/25 blur-[120px]" />
          <div className="absolute right-0 top-40 h-[28rem] w-[28rem] rounded-full bg-accent/30 blur-[120px]" />
          <div className="absolute left-1/2 top-[50%] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-[110px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_75%)]" />
        </div>

        <div className="container relative mx-auto px-4 pt-20 pb-12 md:pt-28 md:pb-16">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <Badge variant="secondary" className="mb-5 w-fit gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
                <Sparkles className="h-3 w-3" /> Now with AI consultation summaries
              </Badge>
              <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
                Healthcare,
                <br />
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-primary via-indigo-500 to-accent bg-clip-text text-transparent">
                    re-imagined.
                  </span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                    <path d="M2 9C60 4 140 2 298 8" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" />
                    <defs><linearGradient id="g" x1="0" y1="0" x2="300" y2="0"><stop stopColor="hsl(var(--primary))" /><stop offset="1" stopColor="hsl(var(--accent))" /></linearGradient></defs>
                  </svg>
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                Verified doctors, instant ambulances, ICU beds, pharmacy delivery and video consults — all in one beautifully fast app for patients, doctors and hospitals.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 gap-2 rounded-full bg-gradient-to-r from-primary to-indigo-600 px-7 text-base font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40">
                  <Link to="/signup">Get started free <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-2 px-7 text-base font-semibold">
                  <Link to="/login">I have an account</Link>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />ABDM-aligned</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />256-bit secure</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />24×7 emergency</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Pan-India coverage</div>
              </div>
            </motion.div>

            {/* RIGHT: floating product mock */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative mx-auto w-full max-w-md"
            >
              {/* main card */}
              <div className="relative rounded-3xl border border-border/60 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/30">
                      <AvatarImage src={doctorAvatarUrl(topDoctors[0]?.avatar_url)} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">AS</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold">{topDoctors[0]?.full_name ?? "Dr. Ananya Sharma"}</div>
                      <div className="text-xs text-muted-foreground">{topDoctors[0]?.specialty ?? "Cardiologist"} · {topDoctors[0]?.experience_years ?? 14} yrs</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white">Verified</Badge>
                </div>

                <div className="my-5 grid grid-cols-3 gap-2 text-center">
                  {["10:00", "10:30", "11:00", "11:30", "12:00", "12:30"].map((t, i) => (
                    <div
                      key={t}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                        i === 2 ? "border-primary bg-gradient-to-br from-primary to-indigo-600 text-white shadow-md shadow-primary/30" : "border-border bg-background/60"
                      }`}
                    >
                      {t}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 p-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Consultation fee</div>
                    <div className="text-2xl font-bold">{inr(topDoctors[0]?.consultation_fee ?? 800)}</div>
                  </div>
                  <Button size="sm" className="rounded-full bg-gradient-to-r from-primary to-indigo-600 px-4 shadow-md shadow-primary/30">
                    <Zap className="mr-1 h-3.5 w-3.5" /> Pay via UPI
                  </Button>
                </div>
              </div>

              {/* floating chip 1: payment received */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute -left-6 -bottom-6 hidden rounded-2xl border border-border/60 bg-card/90 p-3 shadow-xl backdrop-blur-xl md:flex md:items-center md:gap-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
                <div>
                  <div className="text-xs font-semibold">Payment received</div>
                  <div className="text-[10px] text-muted-foreground">UPI · INV-2026-1042</div>
                </div>
              </motion.div>

              {/* floating chip 2: ambulance ETA */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute -right-6 -top-4 hidden rounded-2xl border border-border/60 bg-card/90 p-3 shadow-xl backdrop-blur-xl md:flex md:items-center md:gap-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600"><Ambulance className="h-5 w-5" /></div>
                <div>
                  <div className="text-xs font-semibold">Ambulance ETA · 4 min</div>
                  <div className="text-[10px] text-muted-foreground">Live tracking active</div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* stats row */}
          <div className="mt-20 grid grid-cols-2 gap-6 rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm md:mt-24 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl font-bold bg-gradient-to-br from-primary to-indigo-500 bg-clip-text text-transparent md:text-4xl">{s.value}</div>
                <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS GRID =============================================== */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">All-in-one</Badge>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            One app. All of healthcare.
          </h2>
          <p className="mt-4 text-muted-foreground">From a sniffle to an emergency — we've got you covered.</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}>
              <Link to={s.to} className="group block">
                <Card className="relative h-full overflow-hidden border-border/60 p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-lg`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                  <ArrowRight className="mt-4 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* MEET THE DOCTORS ================================================= */}
      <section className="border-y border-border/60 bg-gradient-to-b from-muted/30 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Meet your doctors</Badge>
              <h2 className="font-display text-4xl font-bold tracking-tight">India's top verified specialists</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">Every doctor manually verified by our medical board. Real names. Real credentials.</p>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/signup">Browse all <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topDoctors.slice(0, 6).map((d: any, i: number) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}>
                <Card className="group h-full overflow-hidden border-border/60 p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 ring-2 ring-primary/15 transition-all group-hover:ring-4 group-hover:ring-primary/30">
                      <AvatarImage src={doctorAvatarUrl(d.avatar_url)} alt={d.full_name} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">{initials(d.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{d.full_name}</div>
                      <div className="text-xs text-muted-foreground">{d.specialty}</div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{d.rating}</span>
                        <span className="text-muted-foreground">· {d.experience_years} yrs</span>
                        {d.city && <span className="text-muted-foreground flex items-center gap-0.5"><MapPin className="h-3 w-3" />{d.city}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                    <div className="text-sm">
                      <span className="text-muted-foreground">From </span>
                      <span className="font-semibold">{inr(Number(d.consultation_fee))}</span>
                    </div>
                    <Button asChild size="sm" className="rounded-full bg-gradient-to-r from-primary to-indigo-600">
                      <Link to="/signup">Book <Calendar className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS ===================================================== */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">How it works</Badge>
          <h2 className="font-display text-4xl font-bold tracking-tight">A doctor in 3 taps.</h2>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            { icon: Stethoscope, n: "01", title: "Pick a specialist", desc: "Filter by symptom, language, city, or rating. Every profile fully verified." },
            { icon: CreditCard, n: "02", title: "Pay via UPI", desc: "Instant slot lock. Receipts and GST invoices generated automatically." },
            { icon: Video, n: "03", title: "Consult & relax", desc: "HD video, live chat, e-Rx delivered to your pharmacy. Done." },
          ].map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border/60 bg-card p-7">
              <div className="absolute right-5 top-5 font-display text-4xl font-bold text-muted-foreground/15">{s.n}</div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/30">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS ===================================================== */}
      <section className="border-y border-border/60 bg-muted/20 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Loved by 120,000+</Badge>
            <h2 className="font-display text-4xl font-bold tracking-tight">Don't take our word for it.</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border/60 p-6">
                <div className="mb-3 flex gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-sm leading-relaxed">"{t.body}"</p>
                <div className="mt-5 border-t border-border/60 pt-4">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FOR PROFESSIONALS =============================================== */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Stethoscope, title: "I'm a Doctor", desc: "Join 1,800+ specialists earning on the platform.", to: "/signup-doctor" as const, color: "from-blue-500 to-indigo-600" },
            { icon: Hospital, title: "I run a Hospital", desc: "Manage branches, ICU beds and staff in real-time.", to: "/signup-hospital" as const, color: "from-violet-500 to-purple-600" },
            { icon: Ambulance, title: "I'm an Ambulance op.", desc: "Get jobs routed by AI. Track payouts daily.", to: "/signup-ambulance" as const, color: "from-rose-500 to-red-600" },
          ].map((p) => (
            <Link key={p.title} to={p.to} className="group">
              <Card className="h-full overflow-hidden border-border/60 p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10">
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${p.color} text-white shadow-lg`}>
                  <p.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Apply now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA ============================================================= */}
      <section className="container mx-auto px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-indigo-600 to-violet-600 p-12 text-primary-foreground shadow-2xl md:p-16">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative z-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <Badge className="mb-4 bg-white/15 text-white backdrop-blur">First 50 consults free</Badge>
              <h2 className="font-display text-4xl font-bold leading-tight md:text-5xl">Better healthcare starts in 30 seconds.</h2>
              <p className="mt-3 max-w-xl text-primary-foreground/85">Create your free account — no card needed. Cancel anytime.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="h-12 rounded-full px-7 text-base font-semibold">
                <Link to="/signup">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/30 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/10">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER ========================================================== */}
      <footer className="border-t border-border/60 bg-muted/20 py-12">
        <div className="container mx-auto grid gap-8 px-4 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              <HeartPulse className="h-5 w-5 text-primary" /> MediCare+
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              India's most loved healthcare platform. Built with care, by clinicians and engineers.
            </p>
          </div>
          <FooterCol title="Product" items={["Find doctors", "Ambulance", "Pharmacy", "Hospitals"]} />
          <FooterCol title="Company" items={["About", "Careers", "Press", "Contact"]} />
          <FooterCol title="Legal" items={["Privacy", "Terms", "ABDM compliance", "Refunds"]} />
        </div>
        <div className="container mx-auto mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 px-4 pt-6 text-xs text-muted-foreground md:flex-row">
          <div>© 2026 MediCare+ · Made with <HeartPulse className="inline h-3 w-3 text-rose-500" /> in India</div>
          <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> 24×7 helpline · 1800-MEDICARE</div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((i) => <li key={i}><a href="#" className="hover:text-foreground">{i}</a></li>)}
      </ul>
    </div>
  );
}
