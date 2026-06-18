import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Copy, Shield, Smartphone, ArrowRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitUpiUtr } from "@/lib/payments.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pay/$paymentId")({
  component: PayPage,
});

function PayPage() {
  const { paymentId } = useParams({ from: "/_authenticated/pay/$paymentId" });
  const navigate = useNavigate();
  const submitUtr = useServerFn(submitUpiUtr);
  const [utr, setUtr] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: payment, error, isLoading } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Payment not found");
      const { data: doc } = await supabase
        .from("public_doctors" as any)
        .select("full_name, specialty")
        .eq("id", data.doctor_id!)
        .maybeSingle();
      return { ...data, doctors: doc };
    },
  });

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading payment...</div>;
  if (error || !payment) return (
    <div className="p-12 text-center">
      <p className="text-destructive font-medium">Could not load payment</p>
      <p className="mt-2 text-sm text-muted-foreground">{(error as Error)?.message ?? "Not found"}</p>
      <Link to="/appointments" className="mt-4 inline-block text-sm underline">Back to appointments</Link>
    </div>
  );

  const upiId = "8885719369@ptaxis";
  const amount = Number(payment.amount);
  const upiUrl = `upi://pay?pa=${upiId}&pn=MediCare+&am=${amount}&cu=INR&tn=INV-${paymentId.slice(0, 8)}`;

  const confirm = async () => {
    if (utr.length < 6) return toast.error("Enter a valid UTR / transaction ID");
    setSubmitting(true);
    try {
      await submitUtr({ data: { paymentId, utr } });
      setSubmitting(false);
      setSuccess(true);
      setTimeout(() => navigate({ to: "/appointments" }), 2400);
    } catch (e: any) {
      setSubmitting(false);
      toast.error(e?.message ?? "Could not submit transaction");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur"
          >
            <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="rounded-3xl bg-card p-12 text-center shadow-elevated">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring" }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock className="h-10 w-10" />
              </motion.div>
              <h2 className="mt-6 font-display text-2xl font-bold">Transaction submitted</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                We've received your UTR. Our team verifies UPI payments within 15 minutes and your appointment is confirmed automatically.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="font-display text-3xl font-bold">Complete payment</h1>
        <p className="text-sm text-muted-foreground">Invoice {payment.invoice_number}</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <div className="text-sm text-muted-foreground">Doctor</div>
            <div className="font-semibold">{(payment as any).doctors?.full_name}</div>
            <div className="text-xs text-muted-foreground">{(payment as any).doctors?.specialty}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Amount</div>
            <div className="text-3xl font-bold">{inr(amount)}</div>
          </div>
        </div>

        <Tabs defaultValue="upi" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upi">UPI / QR</TabsTrigger>
            <TabsTrigger value="card" disabled>Card</TabsTrigger>
            <TabsTrigger value="wallet" disabled>Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="upi" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col items-center rounded-xl border bg-mesh p-6">
                <Badge variant="secondary" className="mb-3 gap-1"><Shield className="h-3 w-3" />Secure UPI</Badge>
                <div className="rounded-2xl bg-card p-4 shadow-soft">
                  <QRCodeSVG value={upiUrl} size={180} level="H" />
                </div>
                <div className="mt-4 text-center text-xs text-muted-foreground">Scan with any UPI app</div>
                <div className="mt-3 flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs">
                  <Smartphone className="h-3 w-3" />
                  <span className="font-mono">{upiId}</span>
                  <button onClick={() => { navigator.clipboard.writeText(upiId); toast.success("UPI ID copied"); }}>
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold">After paying</h3>
                <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>1. Scan the QR with PhonePe / GPay / Paytm</li>
                  <li>2. Complete the payment of {inr(amount)}</li>
                  <li>3. Copy the 12-digit UTR / transaction ID</li>
                  <li>4. Paste it below and confirm</li>
                </ol>
                <div className="mt-5 space-y-2">
                  <Label htmlFor="utr">UTR / Transaction ID</Label>
                  <Input id="utr" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 408712345678" maxLength={20} />
                </div>
                <Button onClick={confirm} disabled={submitting || success} size="lg" className="mt-4 w-full bg-gradient-primary">
                  {submitting ? "Verifying..." : <>Confirm payment <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
                <Link to="/appointments" className="mt-3 block text-center text-xs text-muted-foreground hover:underline">Pay later</Link>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
