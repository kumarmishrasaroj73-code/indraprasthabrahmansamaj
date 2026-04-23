import { useEffect, useMemo, useRef, useState } from "react";
import {
  Phone,
  PhoneOff,
  Video as VideoIcon,
  Mic,
  MicOff,
  VideoOff,
  PhoneIncoming,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type CallState = "idle" | "calling" | "ringing" | "active" | "ended";

type Props = {
  conversationId: string;
  userId: string;
  participantIds: string[]; // OTHER user ids in the conversation
  conversationName: string;
};

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// One-shot: a tiny ringtone using WebAudio (no asset needed)
const playTone = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 520;
    g.gain.value = 0.05;
    o.connect(g).connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 400);
  } catch {
    /* ignore */
  }
};

export const CallDialog = ({
  conversationId,
  userId,
  participantIds,
  conversationName,
}: Props) => {
  const [state, setState] = useState<CallState>("idle");
  const [callId, setCallId] = useState<string | null>(null);
  const [callType, setCallType] = useState<"voice" | "video">("voice");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [incoming, setIncoming] = useState<{
    id: string;
    type: "voice" | "video";
    from: string;
  } | null>(null);
  const [duration, setDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callerRef = useRef<boolean>(false); // true if I initiated
  const otherIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<number | null>(null);

  const sendSignal = async (
    type: "offer" | "answer" | "ice" | "bye",
    payload: any,
    cId: string
  ) => {
    await supabase.from("chat_call_signals").insert({
      call_id: cId,
      from_user: userId,
      to_user: otherIdRef.current,
      signal_type: type,
      payload,
    });
  };

  const cleanup = (markEnded: "ended" | "missed" | "declined" = "ended") => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        /* */
      }
      pcRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDuration(0);
    setMuted(false);
    setCamOff(false);
    if (callId) {
      supabase
        .from("chat_calls")
        .update({ status: markEnded, ended_at: new Date().toISOString() })
        .eq("id", callId)
        .then(() => {});
    }
    setCallId(null);
    setIncoming(null);
    setState("idle");
  };

  // Listen for incoming calls on this conversation
  useEffect(() => {
    const ch = supabase
      .channel(`incoming-calls-${conversationId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_calls",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row: any = payload.new;
          if (row.initiated_by === userId) return;
          // Only show ringing UI if I'm idle
          setState((s) => {
            if (s !== "idle") return s;
            otherIdRef.current = row.initiated_by;
            setCallId(row.id);
            setIncoming({ id: row.id, type: row.call_type, from: row.initiated_by });
            playTone();
            const interval = setInterval(playTone, 1500);
            // store on window so we can clear if accepted/declined
            (window as any).__ringInterval = interval;
            return "ringing";
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, userId]);

  const subscribeSignals = (cId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`call-signals-${cId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_call_signals",
          filter: `call_id=eq.${cId}`,
        },
        async (payload) => {
          const row: any = payload.new;
          if (row.from_user === userId) return;
          const pc = pcRef.current;
          if (!pc) return;
          try {
            if (row.signal_type === "offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(row.payload));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await sendSignal("answer", answer, cId);
            } else if (row.signal_type === "answer") {
              await pc.setRemoteDescription(new RTCSessionDescription(row.payload));
            } else if (row.signal_type === "ice") {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(row.payload));
              } catch {
                /* */
              }
            } else if (row.signal_type === "bye") {
              cleanup("ended");
            }
          } catch (e) {
            console.error("Signal error", e);
          }
        }
      )
      .subscribe();
    channelRef.current = ch;
  };

  const buildPC = (cId: string, video: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal("ice", e.candidate.toJSON(), cId);
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      remoteStreamRef.current = stream;
      if (video && remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setState("active");
        if (!timerRef.current) {
          timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000);
        }
      }
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        cleanup("ended");
      }
    };
    return pc;
  };

  const getMedia = async (video: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video ? { facingMode: "user" } : false,
    });
    localStreamRef.current = stream;
    if (video && localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const startCall = async (type: "voice" | "video") => {
    if (participantIds.length === 0) {
      toast({ title: "No one to call", variant: "destructive" });
      return;
    }
    callerRef.current = true;
    otherIdRef.current = participantIds[0]; // 1:1; for groups uses first peer
    setCallType(type);
    setState("calling");

    const { data, error } = await supabase
      .from("chat_calls")
      .insert({
        conversation_id: conversationId,
        initiated_by: userId,
        call_type: type,
        status: "ringing",
      })
      .select("id")
      .single();
    if (error || !data) {
      toast({ title: "Could not start call", description: error?.message, variant: "destructive" });
      cleanup("ended");
      return;
    }
    setCallId(data.id);
    subscribeSignals(data.id);

    try {
      const stream = await getMedia(type === "video");
      const pc = buildPC(data.id, type === "video");
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", offer, data.id);
    } catch (e: any) {
      toast({
        title: "Microphone/camera permission denied",
        description: e.message,
        variant: "destructive",
      });
      cleanup("ended");
    }
  };

  const acceptCall = async () => {
    if (!incoming) return;
    if ((window as any).__ringInterval) clearInterval((window as any).__ringInterval);
    setCallType(incoming.type);
    setState("active");
    callerRef.current = false;
    subscribeSignals(incoming.id);
    await supabase
      .from("chat_calls")
      .update({ status: "active" })
      .eq("id", incoming.id);
    try {
      const stream = await getMedia(incoming.type === "video");
      const pc = buildPC(incoming.id, incoming.type === "video");
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      // Wait for offer signal subscription handler to set remote description and answer
    } catch (e: any) {
      toast({
        title: "Microphone/camera permission denied",
        description: e.message,
        variant: "destructive",
      });
      if (callId) await sendSignal("bye", {}, callId);
      cleanup("ended");
    }
  };

  const declineCall = async () => {
    if ((window as any).__ringInterval) clearInterval((window as any).__ringInterval);
    if (incoming) {
      await supabase
        .from("chat_calls")
        .update({ status: "declined", ended_at: new Date().toISOString() })
        .eq("id", incoming.id);
    }
    setIncoming(null);
    setState("idle");
    setCallId(null);
  };

  const hangUp = async () => {
    if (callId) await sendSignal("bye", {}, callId);
    cleanup("ended");
  };

  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };
  const toggleCam = () => {
    const next = !camOff;
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCamOff(next);
  };

  const showDialog = state !== "idle";
  const fmt = useMemo(() => {
    const m = Math.floor(duration / 60)
      .toString()
      .padStart(2, "0");
    const s = (duration % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [duration]);

  return (
    <>
      {/* Trigger buttons - rendered by parent. Expose imperative via DOM events. */}
      <div className="hidden">
        <button id={`call-voice-${conversationId}`} onClick={() => startCall("voice")} />
        <button id={`call-video-${conversationId}`} onClick={() => startCall("video")} />
      </div>

      <Dialog open={showDialog} onOpenChange={(o) => !o && hangUp()}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-accent/40">
          <DialogTitle className="sr-only">
            {callType === "video" ? "Video call" : "Voice call"} with {conversationName}
          </DialogTitle>
          <div className="bg-gradient-saffron text-primary-foreground p-6 text-center">
            <div className="text-xs uppercase tracking-widest opacity-90 mb-1">
              {state === "ringing"
                ? "Incoming call"
                : state === "calling"
                ? "Calling…"
                : state === "active"
                ? callType === "video"
                  ? "Video call"
                  : "Voice call"
                : "Call ended"}
            </div>
            <h2 className="font-serif text-2xl font-bold">{conversationName}</h2>
            {state === "active" && (
              <p className="text-xs opacity-90 mt-1">{fmt}</p>
            )}
          </div>

          {callType === "video" && state === "active" && (
            <div className="relative bg-secondary aspect-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-3 right-3 w-24 h-32 object-cover rounded-md ring-2 ring-primary-foreground/60 bg-black"
              />
            </div>
          )}

          {/* hidden audio element for voice */}
          <audio ref={remoteAudioRef} autoPlay />

          <div className="p-6 flex items-center justify-center gap-3 bg-card">
            {state === "ringing" ? (
              <>
                <Button
                  variant="destructive"
                  size="lg"
                  className="rounded-full h-14 w-14 p-0"
                  onClick={declineCall}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button
                  size="lg"
                  className="rounded-full h-14 w-14 p-0 bg-accent text-accent-foreground hover:opacity-90"
                  onClick={acceptCall}
                >
                  <PhoneIncoming className="h-6 w-6" />
                </Button>
              </>
            ) : (
              <>
                {state === "active" && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full h-12 w-12 p-0"
                    onClick={toggleMute}
                  >
                    {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                )}
                {state === "active" && callType === "video" && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full h-12 w-12 p-0"
                    onClick={toggleCam}
                  >
                    {camOff ? (
                      <VideoOff className="h-5 w-5" />
                    ) : (
                      <VideoIcon className="h-5 w-5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="lg"
                  className="rounded-full h-14 w-14 p-0"
                  onClick={hangUp}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper exported for the chat header buttons
export const triggerCall = (conversationId: string, type: "voice" | "video") => {
  const el = document.getElementById(`call-${type}-${conversationId}`) as HTMLButtonElement | null;
  el?.click();
};
