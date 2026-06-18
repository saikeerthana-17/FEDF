import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Mic, MicOff, VideoOff, PhoneOff, MessageSquare } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/consult")({
  component: ConsultPage,
});

function ConsultPage() {
  const [muted, setMuted] = useState(false);
  const [cam, setCam] = useState(true);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Video Consultation</h1>
          <p className="text-sm text-muted-foreground">Daily.co integration in testing — using demo room.</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">Testing Mode</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
        <Card className="overflow-hidden">
          <div className="relative aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white/80">
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                  <Video className="h-9 w-9" />
                </div>
                <p className="font-medium">Doctor will join shortly</p>
                <p className="text-xs text-white/60">Waiting room · Encrypted end-to-end</p>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 h-28 w-44 rounded-lg border-2 border-white/20 bg-slate-700 shadow-xl" />
          </div>
          <CardContent className="flex items-center justify-center gap-3 py-4">
            <Button size="icon" variant={muted ? "destructive" : "outline"} onClick={() => setMuted(!muted)} className="rounded-full h-11 w-11">
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant={!cam ? "destructive" : "outline"} onClick={() => setCam(!cam)} className="rounded-full h-11 w-11">
              {cam ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="destructive" className="rounded-full h-11 w-11">
              <PhoneOff className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-sm font-medium">
              <MessageSquare className="h-4 w-4" /> In-call chat
            </div>
            <div className="space-y-3 py-4 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <div className="text-xs text-muted-foreground">System</div>
                You joined the consultation room.
              </div>
            </div>
            <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Type a message…" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
