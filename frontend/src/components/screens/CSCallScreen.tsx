import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { api } from "../../services/api";

const POLL_INTERVAL = 3000;
const API = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || window.location.origin + "/api";

/** Play an MP3 blob through the browser's Audio element */
async function playAudioBlob(blob: Blob): Promise<void> {
  if (!blob || blob.size === 0) return;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  return new Promise((resolve) => {
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    const p = audio.play();
    if (p) p.catch(() => { URL.revokeObjectURL(url); resolve(); });
  });
}

export default function CSCallHandler({ sessionId: initialSessionId }: { sessionId: string }) {
  const [callState, setCallState] = useState<"none" | "ringing" | "connected" | "ended">("none");
  const [callerName, setCallerName] = useState("Agent");
  const [ticketId, setTicketId] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [lastMsgId, setLastMsgId] = useState(0);
  const [lastUserMsg, setLastUserMsg] = useState("");
  const [bookingAnnouncement, setBookingAnnouncement] = useState("");

  const sessionIdRef = useRef(initialSessionId);
  const ticketIdRef = useRef("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastMsgIdRef = useRef(0);
  const checkedBookingRef = useRef<Record<string, boolean>>({});

  // Always start polling — sessionId starts empty but tickets may match later
  useEffect(() => {
    sessionIdRef.current = initialSessionId;
    startPolling();
    return () => stopPolling();
  }, [initialSessionId]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(checkForCall, POLL_INTERVAL);
    checkForCall();
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Find best matching ticket — by session_id, or fall back to most recent open ticket
  const findTicket = useCallback((tickets: any[]): any | null => {
    const openTickets = tickets.filter((t: any) => t.status !== "closed");
    // Prefer by session_id
    if (sessionIdRef.current) {
      const bySession = openTickets.find((t: any) => t.session_id === sessionIdRef.current);
      if (bySession) return bySession;
    }
    // Fall back to most recent open ticket
    const sorted = [...openTickets].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0] || null;
  }, []);

  // Check if there's an active CS ticket with a call
  const checkForCall = useCallback(async () => {
    try {
      const res = await fetch(`${API}/cs/tickets`);
      const data = await res.json();
      const ticket = findTicket(data.tickets || []);
      if (!ticket) return;

      const cs = ticket.call_status;

      // Ringing → user hasn't answered yet
      if (cs === "calling" && callState === "none") {
        setTicketId(ticket.id);
        ticketIdRef.current = ticket.id;
        setCallerName(ticket.call_agent || "CS Agent");
        setCallState("ringing");
        playRingtone();
        return;
      }

      // Connected → call is active
      if (cs === "in_call" && callState !== "connected") {
        setTicketId(ticket.id);
        ticketIdRef.current = ticket.id;
        setCallerName(ticket.call_agent || "CS Agent");
        setCallState("connected");
        setCallDuration(0);
        startDurationTimer();
        pollMessages();
        return;
      }

      // Ended → tear down call UI
      if (cs === "ended" && callState === "connected") {
        endCallUI();
        return;
      }

      // ── BOOKING ANNOUNCEMENT (no call) ────────────────────
      // If not in a call but we have a ticket, check for new BOOKING: messages
      if (callState === "none" && ticket.id && !checkedBookingRef.current[ticket.id]) {
        try {
          const msgRes = await fetch(`${API}/cs/tickets/${ticket.id}/messages`);
          const msgData = await msgRes.json();
          const msgs = msgData.messages || [];
          for (const m of msgs) {
            if (m.sender === "system" && m.message.startsWith("BOOKING:")) {
              checkedBookingRef.current[ticket.id] = true;
              const bookingJson = JSON.parse(m.message.replace("BOOKING:", ""));
              if (bookingJson.type === "booking_confirmed") {
                const speech = `Your flight has been booked! ${bookingJson.airline} from ${bookingJson.origin} to ${bookingJson.destination} on ${bookingJson.date} for ${bookingJson.passenger_name}. Total ${bookingJson.total_amount}. Booking reference ${bookingJson.booking_reference}. Thank you for using Wayfinder!`;
                setBookingAnnouncement(speech);
                try { const blob = await api.speak(speech); await playAudioBlob(blob); } catch {}
                // Auto-dismiss after 12 seconds
                setTimeout(() => setBookingAnnouncement(""), 12000);
              }
              break;
            }
          }
        } catch {}
      }
    } catch (e) {
      // Silently retry
    }
  }, [callState, setBookingAnnouncement]);

  // Play ringtone
  const playRingtone = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.3;
      osc.type = "sine";
      osc.frequency.value = 440;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => { try { osc.stop(); ctx.close(); } catch {} }, 500);
      setTimeout(() => {
        try {
          const ctx2 = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          gain2.gain.value = 0.3;
          osc2.type = "sine";
          osc2.frequency.value = 660;
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.start();
          setTimeout(() => { try { osc2.stop(); ctx2.close(); } catch {} }, 500);
        } catch {}
      }, 800);
    } catch {}
  }, []);

  const startDurationTimer = useCallback(() => {
    if (durationRef.current) clearInterval(durationRef.current);
    durationRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Poll for new messages and play them as TTS
  const pollMessages = useCallback(async () => {
    if (!ticketIdRef.current) return;
    try {
      const res = await fetch(`${API}/cs/tickets/${ticketIdRef.current}/messages`);
      const data = await res.json();
      const msgs = data.messages || [];
      for (const m of msgs) {
        // Check for structured booking confirmation
        if (m.id > lastMsgIdRef.current && m.sender === "system" && m.message.startsWith("BOOKING:")) {
          lastMsgIdRef.current = m.id;
          setLastMsgId(m.id);
          try {
            const bookingJson = JSON.parse(m.message.replace("BOOKING:", ""));
            if (bookingJson.type === "booking_confirmed") {
              const speech = `Your flight has been booked! ${bookingJson.airline} from ${bookingJson.origin} to ${bookingJson.destination} on ${bookingJson.date} for ${bookingJson.passenger_name}. Total ${bookingJson.total_amount}. Booking reference ${bookingJson.booking_reference}. Thank you for using Wayfinder!`;
              setTranscript(speech);
              try { const blob = await api.speak(speech); await playAudioBlob(blob); } catch {}
            }
          } catch {}
        }
        // Play agent messages as TTS
        if (m.id > lastMsgIdRef.current && m.sender === "agent") {
          lastMsgIdRef.current = m.id;
          setLastMsgId(m.id);
          try { const blob = await api.speak(m.message); await playAudioBlob(blob); } catch {}
        }
      }
    } catch {}
    if (callState === "connected") {
      setTimeout(pollMessages, 2000);
    }
  }, [callState]);

  // Accept call
  const acceptCall = useCallback(async () => {
    if (!ticketIdRef.current) return;
    try {
      await fetch(`${API}/cs/tickets/${ticketIdRef.current}/call/accept`, { method: "POST" });
      setCallState("connected");
      setCallDuration(0);
      startDurationTimer();
      pollMessages();
    } catch {}
  }, [startDurationTimer, pollMessages]);

  // End call
  const endCall = useCallback(async () => {
    stopRecording();
    if (ticketIdRef.current) {
      try {
        await fetch(`${API}/cs/tickets/${ticketIdRef.current}/call/end`, { method: "POST" });
      } catch {}
    }
    endCallUI();
  }, []);

  const endCallUI = useCallback(() => {
    setCallState("ended");
    if (durationRef.current) clearInterval(durationRef.current);
    if (pollingRef.current) clearInterval(pollingRef.current);
  }, []);

  // User speaks → Whisper → send as message
  const startRecording = useCallback(async () => {
    try {
      setTranscript("Listening...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (audioChunksRef.current.length === 0) return;
        setIsSpeaking(false);
        setTranscript("Transcribing...");
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        try {
          const result = await api.listen(blob, "call_recording.webm");
          const text = result.transcript || "";
          if (text.trim() && ticketIdRef.current) {
            setTranscript(`You: ${text}`);
            setLastUserMsg(text);
            await fetch(`${API}/cs/tickets/${ticketIdRef.current}/message?sender=user&message=${encodeURIComponent(text)}`, { method: "POST" });
          } else {
            setTranscript("");
          }
        } catch {
          setTranscript("");
        }
      };
      recorder.start();
      setIsSpeaking(true);
    } catch {
      setTranscript("Mic unavailable");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
      if (durationRef.current) clearInterval(durationRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [stopRecording]);

  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // No call overlay and no booking → render invisible anchor to keep polling alive
  const showCallOverlay = callState !== "none";
  const showBookingBanner = callState === "none" && bookingAnnouncement;

  if (!showCallOverlay && !showBookingBanner) {
    return <div id="cs-call-handler" style={{ display: "none" }} />;
  }

  return (
    <>
      {/* ── CALL OVERLAY ────────────────── */}
      {showCallOverlay && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "rgba(6,9,18,0.95)" }}>
          <div className="flex flex-col items-center gap-8 px-8 w-full max-w-sm">
            {/* ── RINGING ──────────────────── */}
            {callState === "ringing" && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-28 h-28 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.1))",
                    border: "3px solid rgba(34,197,94,0.3)",
                  }}
                >
                  <PhoneIncoming size={48} color="#22C55E" />
                </motion.div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white mb-1">Incoming Call</p>
                  <p className="text-sm text-[#22C55E] font-semibold">{callerName}</p>
                  <p className="text-xs text-[#64748B] mt-2">Customer Support</p>
                </div>
                <div className="flex gap-8">
                  <button
                    onClick={endCall}
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.15)", border: "3px solid rgba(239,68,68,0.3)" }}
                  >
                    <PhoneOff size={32} color="#EF4444" />
                  </button>
                  <button
                    onClick={acceptCall}
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(34,197,94,0.15)", border: "3px solid rgba(34,197,94,0.3)" }}
                  >
                    <Phone size={32} color="#22C55E" />
                  </button>
                </div>
                <p className="text-xs text-[#64748B]">Decline · Accept</p>
              </>
            )}

            {/* ── CONNECTED ─────────────────── */}
            {callState === "connected" && (
              <>
                <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)", border: "3px solid rgba(34,197,94,0.2)" }}>
                  <Phone size={40} color="#22C55E" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{callerName}</p>
                  <p className="text-sm text-[#22C55E] font-mono">{formatTime(callDuration)}</p>
                </div>

                {/* Transcript */}
                {transcript && (
                  <div className="rounded-xl px-5 py-3 text-center w-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-sm text-[#94A3B8]">{transcript}</p>
                  </div>
                )}

                {/* Voice wave */}
                <div className="flex items-center gap-1" aria-hidden="true">
                  {[30, 50, 70, 90, 100, 90, 70, 50, 30].map((h, i) => (
                    <motion.div
                      key={i}
                      className="rounded-full"
                      style={{
                        width: 4,
                        background: isSpeaking ? "linear-gradient(180deg,#4F46E5,#22C55E)" : "rgba(255,255,255,0.15)",
                      }}
                      animate={isSpeaking ? { height: [h * 0.3, h, h * 0.5, h * 0.8, h * 0.3] } : { height: 6 }}
                      transition={isSpeaking ? { duration: 0.8 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 } : { duration: 0.3 }}
                    />
                  ))}
                </div>

                {/* Mic button */}
                <button
                  onClick={isSpeaking ? stopRecording : startRecording}
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{
                    background: isSpeaking ? "linear-gradient(135deg,#4F46E5,#6366f1)" : "rgba(255,255,255,0.06)",
                    border: isSpeaking ? "3px solid rgba(255,255,255,0.2)" : "3px solid rgba(255,255,255,0.1)",
                    boxShadow: isSpeaking ? "0 0 40px rgba(79,70,229,0.4)" : "none",
                  }}
                >
                  {isSpeaking ? <MicOff size={36} color="#fff" /> : <Mic size={36} color="#fff" />}
                </button>
                <p className="text-xs text-[#64748B]">{isSpeaking ? "Tap to stop" : "Tap to speak"}</p>

                {/* Hang up */}
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.15)", border: "3px solid rgba(239,68,68,0.3)" }}
                >
                  <PhoneOff size={24} color="#EF4444" />
                </button>
              </>
            )}

            {/* ── ENDED ─────────────────────── */}
            {callState === "ended" && (
              <>
                <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: "rgba(148,163,184,0.1)", border: "3px solid rgba(148,163,184,0.2)" }}>
                  <PhoneOff size={40} color="#64748B" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white mb-1">Call Ended</p>
                  <p className="text-xs text-[#64748B]">{callerName} · {formatTime(callDuration)}</p>
                </div>
                <button
                  onClick={() => setCallState("none")}
                  className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "rgba(79,70,229,0.15)", border: "1px solid rgba(79,70,229,0.2)" }}
                >
                  Back to App
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── BOOKING ANNOUNCEMENT ──────────────── */}
      {showBookingBanner && (
        <div
          className="fixed bottom-6 left-4 right-4 z-[9999] rounded-2xl px-5 py-4 text-center shadow-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))",
            border: "1px solid rgba(34,197,94,0.3)",
            backdropFilter: "blur(12px)",
            maxWidth: "400px",
            margin: "0 auto",
          }}
        >
          <p className="text-sm font-bold text-[#22C55E] mb-1">✈️ Flight Booked!</p>
          <p className="text-xs text-[#94A3B8]">{bookingAnnouncement}</p>
        </div>
      )}
    </>
  );
}