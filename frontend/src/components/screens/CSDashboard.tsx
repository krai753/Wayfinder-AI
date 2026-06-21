import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Phone, X, Send, Clock, CheckCircle, AlertCircle, User, HeadphonesIcon, Plane, DollarSign, Calendar, Users, ChevronDown } from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || window.location.origin + "/api";

interface Ticket {
  id: string;
  session_id: string;
  user_name: string;
  issue: string;
  status: string;
  agent_id: string | null;
  created_at: string;
  message_count: number;
  last_message: string;
  call_status?: string;
}

interface Message {
  id: number;
  ticket_id: string;
  sender: string;
  message: string;
  created_at: string;
}

type ActiveTab = "chat" | "booking";

export default function CSDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [notifications, setNotifications] = useState(0);
  const [agentName, setAgentName] = useState("Agent Smith");
  const [editingName, setEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Booking form state
  const [bkName, setBkName] = useState("");
  const [bkOrigin, setBkOrigin] = useState("");
  const [bkDest, setBkDest] = useState("");
  const [bkDate, setBkDate] = useState("");
  const [bkPassengers, setBkPassengers] = useState("1");
  const [bkSeat, setBkSeat] = useState("economy");
  const [bkBudget, setBkBudget] = useState("");
  const [bkResult, setBkResult] = useState<{ msg: string; type: string } | null>(null);
  const [bkLoading, setBkLoading] = useState(false);

  // Poll for tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch(`${BASE}/cs/tickets`);
        if (res.ok) {
          const data = await res.json();
          const openTickets = data.tickets.filter((t: Ticket) => t.status !== "closed");
          const prevCount = tickets.filter((t) => t.status !== "closed").length;
          if (openTickets.length > prevCount && prevCount > 0) {
            setNotifications((n) => n + (openTickets.length - prevCount));
          }
          setTickets(data.tickets);
        }
      } catch {}
    };
    fetchTickets();
    const interval = setInterval(fetchTickets, 3000);
    return () => clearInterval(interval);
  }, []);

  // Poll for messages when a ticket is active
  useEffect(() => {
    if (!activeTicket) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${BASE}/cs/tickets/${activeTicket.id}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch {}
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [activeTicket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openTicket = useCallback(async (ticket: Ticket) => {
    setActiveTicket(ticket);
    setNotifications(0);
    // Pre-fill name from ticket
    if (ticket.user_name && ticket.user_name !== "Guest") {
      setBkName(ticket.user_name);
    }
    if (ticket.status === "open") {
      try {
        await fetch(`${BASE}/cs/tickets/${ticket.id}/assign?agent_id=${encodeURIComponent(agentName)}`, { method: "POST" });
        setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: "assigned", agent_id: agentName } : t)));
      } catch {}
    }
  }, [agentName]);

  const sendMessage = useCallback(async () => {
    if (!messageInput.trim() || !activeTicket) return;
    try {
      await fetch(
        `${BASE}/cs/tickets/${activeTicket.id}/message?sender=agent&message=${encodeURIComponent(messageInput.trim())}`,
        { method: "POST" }
      );
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), ticket_id: activeTicket.id, sender: "agent", message: messageInput.trim(), created_at: new Date().toISOString() },
      ]);
      setMessageInput("");
    } catch {}
  }, [messageInput, activeTicket]);

  const closeTicket = useCallback(async () => {
    if (!activeTicket) return;
    try {
      await fetch(`${BASE}/cs/tickets/${activeTicket.id}/close`, { method: "POST" });
      setTickets((prev) => prev.map((t) => (t.id === activeTicket.id ? { ...t, status: "closed" } : t)));
      setActiveTicket(null);
    } catch {}
  }, [activeTicket]);

  // ── Agent Booking ──────────────────────────────────────────────

  const agentBookFlight = useCallback(async () => {
    if (!activeTicket) {
      setBkResult({ msg: "Select a ticket first", type: "error" });
      return;
    }
    if (!bkName.trim()) { setBkResult({ msg: "Enter passenger name", type: "error" }); return; }
    if (!bkOrigin.trim()) { setBkResult({ msg: "Enter origin city or IATA (e.g. London, LHR)", type: "error" }); return; }
    if (!bkDest.trim()) { setBkResult({ msg: "Enter destination city or IATA (e.g. Tokyo, NRT)", type: "error" }); return; }
    if (!bkDate) { setBkResult({ msg: "Select a departure date", type: "error" }); return; }

    setBkLoading(true);
    setBkResult({ msg: "Searching flights...", type: "loading" });

    try {
      const params = new URLSearchParams({
        ticket_id: activeTicket.id,
        origin: bkOrigin.trim().toUpperCase(),
        destination: bkDest.trim().toUpperCase(),
        departure_date: bkDate,
        passenger_name: bkName.trim(),
        passengers: bkPassengers,
        seat_class: bkSeat,
      });
      if (bkBudget) params.set("max_price", bkBudget);

      const res = await fetch(`${BASE}/cs/book-for-user?${params}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Booking failed");

      setBkResult({
        msg: `✅ Booked! ${data.origin} → ${data.destination} on ${data.departure_date} for ${data.passenger_name}. ${data.airline} ${data.flight_number} ${data.total_amount}. Ref: ${data.booking_reference}`,
        type: "success",
      });
    } catch (e: any) {
      setBkResult({ msg: `❌ ${e.message}`, type: "error" });
    } finally {
      setBkLoading(false);
    }
  }, [activeTicket, bkName, bkOrigin, bkDest, bkDate, bkPassengers, bkSeat, bkBudget]);

  const statusColor = (status: string) => {
    switch (status) {
      case "open": return "#F59E0B";
      case "assigned": return "#4F46E5";
      case "closed": return "#22C55E";
      default: return "#64748B";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "open": return "New";
      case "assigned": return "Active";
      case "closed": return "Resolved";
      default: return status;
    }
  };

  const timeAgo = (ts: string) => {
    const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  };

  const openTickets = tickets.filter((t) => t.status !== "closed");

  return (
    <div className="min-h-screen flex" style={{ background: "#0B1020" }}>
      {/* ── SIDEBAR ──────────────────────────────────────────── */}
      <div className="w-80 flex flex-col border-r shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(13,18,33,0.8)" }}>
        <div className="px-5 pt-14 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 mb-3">
            <HeadphonesIcon size={22} color="#4F46E5" />
            <h1 className="text-lg font-bold text-white">CS Dashboard</h1>
            {notifications > 0 && (
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "#EF4444", color: "#fff" }}>
                {notifications} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editingName ? (
              <input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                className="flex-1 bg-transparent text-sm text-white px-2 py-1 rounded-lg"
                style={{ border: "1px solid rgba(79,70,229,0.3)", background: "rgba(255,255,255,0.04)" }}
                autoFocus
              />
            ) : (
              <button onClick={() => setEditingName(true)} className="flex items-center gap-2 text-xs text-[#64748B] hover:text-white transition-colors">
                <User size={14} /> {agentName}
              </button>
            )}
          </div>
          <p className="text-[10px] text-[#64748B] mt-2">{openTickets.length} open tickets</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-5 text-center">
              <Phone size={40} color="#64748B" className="mb-3 opacity-30" />
              <p className="text-sm text-[#64748B]">No tickets yet</p>
              <p className="text-[10px] text-[#475569] mt-1">Tickets appear here when users need CS support</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className={`w-full text-left px-5 py-4 border-b transition-colors hover:bg-white/[0.02] ${
                  activeTicket?.id === ticket.id ? "bg-white/[0.04]" : ""
                }`}
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white truncate flex-1">{ticket.user_name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: `${statusColor(ticket.status)}15`, color: statusColor(ticket.status), border: `1px solid ${statusColor(ticket.status)}25` }}>
                    {ticket.call_status === "in_call" ? "📞 Call" : statusLabel(ticket.status)}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] truncate">{ticket.last_message || ticket.issue || "No messages yet"}</p>
                <p className="text-[9px] text-[#475569] mt-1">{timeAgo(ticket.created_at)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── MAIN AREA ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {activeTicket ? (
          <>
            {/* Header + Tabs */}
            <div className="px-6 py-3 border-b flex items-center gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(79,70,229,0.15)" }}>
                <User size={16} color="#4F46E5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{activeTicket.user_name}</p>
                <p className="text-[10px] text-[#64748B]">Ticket: {activeTicket.id}</p>
              </div>
              <button onClick={() => closeTicket()} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle size={14} className="inline mr-1" /> Resolve
              </button>
              <button onClick={() => setActiveTicket(null)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
                <X size={16} color="#64748B" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <button onClick={() => setActiveTab("chat")}
                className="px-5 py-2.5 text-xs font-semibold transition-colors"
                style={{ color: activeTab === "chat" ? "#4F46E5" : "#64748B", borderBottom: activeTab === "chat" ? "2px solid #4F46E5" : "2px solid transparent" }}>
                💬 Chat
              </button>
              <button onClick={() => setActiveTab("booking")}
                className="px-5 py-2.5 text-xs font-semibold transition-colors"
                style={{ color: activeTab === "booking" ? "#4F46E5" : "#64748B", borderBottom: activeTab === "booking" ? "2px solid #4F46E5" : "2px solid transparent" }}>
                ✈️ Book Flight
              </button>
            </div>

            {/* ── CHAT TAB ──────────────────────────────────── */}
            {activeTab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare size={36} color="#64748B" className="mb-2 opacity-30" />
                      <p className="text-sm text-[#64748B]">No messages yet</p>
                      <p className="text-[10px] text-[#475569] mt-1">Send a message to start the conversation</p>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${msg.sender === "agent" ? "rounded-tr-md" : "rounded-tl-md"}`}
                        style={msg.sender === "agent"
                          ? { background: "linear-gradient(135deg,#4F46E5,#6366f1)" }
                          : msg.sender === "system"
                          ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }
                          : { background: "rgba(255,255,255,0.08)" }}>
                        <p className={`text-sm ${msg.sender === "system" ? "text-[#64748B] italic" : "text-white"}`}>
                          {msg.message.startsWith("BOOKING:") ? "📋 📞 Booking confirmation sent to user (read aloud via TTS)" : msg.message}
                        </p>
                        <p className={`text-[9px] mt-1 ${msg.sender === "agent" ? "text-white/50" : "text-[#475569]"}`}>
                          {msg.sender === "agent" ? agentName : msg.sender === "system" ? "System" : activeTicket?.user_name || "User"}
                          {" · "}{timeAgo(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "rgba(21,28,47,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <input value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type your response..." className="flex-1 bg-transparent text-sm text-white placeholder-[#64748B] focus:outline-none" />
                    <button onClick={sendMessage} disabled={!messageInput.trim()}
                      className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
                      style={{ background: messageInput.trim() ? "linear-gradient(135deg,#4F46E5,#6366f1)" : "transparent" }}>
                      <Send size={16} color="#fff" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── BOOK FLIGHT TAB ─────────────────────────────── */}
            {activeTab === "booking" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-lg mx-auto space-y-4">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plane size={16} color="#4F46E5" /> Book Flight for {activeTicket.user_name}
                  </h2>

                  {/* Passenger Name */}
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Passenger Name</label>
                    <input value={bkName} onChange={(e) => setBkName(e.target.value)}
                      placeholder="e.g. John Smith"
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-[#475569] focus:outline-none"
                      style={{ background: "rgba(21,28,47,0.8)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>

                  {/* Origin + Destination */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Origin</label>
                      <input value={bkOrigin} onChange={(e) => setBkOrigin(e.target.value)}
                        placeholder="e.g. London, Tokyo, or LHR"
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-[#475569] focus:outline-none"
                        style={{ background: "rgba(21,28,47,0.8)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Destination</label>
                      <input value={bkDest} onChange={(e) => setBkDest(e.target.value)}
                        placeholder="e.g. Paris, New York, or NRT"
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-[#475569] focus:outline-none"
                        style={{ background: "rgba(21,28,47,0.8)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                      <Calendar size={12} className="inline mr-1" /> Departure Date
                    </label>
                    <input type="date" value={bkDate} onChange={(e) => setBkDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none"
                      style={{ background: "rgba(21,28,47,0.8)", border: "1px solid rgba(255,255,255,0.08)", colorScheme: "dark" }} />
                  </div>

                  {/* Passengers + Seat */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                        <Users size={12} className="inline mr-1" /> Passengers
                      </label>
                      <select value={bkPassengers} onChange={(e) => setBkPassengers(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none"
                        style={{ background: "rgba(21,28,47,0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Adult{n > 1 ? "s" : ""}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                        <ChevronDown size={12} className="inline mr-1" /> Seat Class
                      </label>
                      <select value={bkSeat} onChange={(e) => setBkSeat(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none"
                        style={{ background: "rgba(21,28,47,0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <option value="economy">Economy</option>
                        <option value="premium_economy">Premium Economy</option>
                        <option value="business">Business</option>
                        <option value="first">First Class</option>
                      </select>
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                      <DollarSign size={12} className="inline mr-1" /> Max Budget (optional)
                    </label>
                    <input type="number" value={bkBudget} onChange={(e) => setBkBudget(e.target.value)}
                      placeholder="e.g. 500" min="0"
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-[#475569] focus:outline-none"
                      style={{ background: "rgba(21,28,47,0.8)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>

                  {/* Submit */}
                  <button onClick={agentBookFlight} disabled={bkLoading}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 active:scale-[0.98]"
                    style={{ background: bkLoading ? "#2D3B55" : "linear-gradient(135deg,#4F46E5,#6366f1)" }}>
                    {bkLoading ? "🔍 Searching & Booking..." : "🔍 Search & Book for User"}
                  </button>

                  {/* Result */}
                  {bkResult && (
                    <div className="rounded-xl px-4 py-3 text-sm"
                      style={{
                        background: bkResult.type === "success" ? "rgba(34,197,94,0.1)" : bkResult.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(79,70,229,0.1)",
                        border: bkResult.type === "success" ? "1px solid rgba(34,197,94,0.2)" : bkResult.type === "error" ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(79,70,229,0.2)",
                        color: bkResult.type === "success" ? "#22C55E" : bkResult.type === "error" ? "#FCA5A5" : "#818CF8",
                      }}>
                      {bkResult.msg}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(79,70,229,0.1)", border: "2px solid rgba(79,70,229,0.15)" }}>
              <HeadphonesIcon size={40} color="#4F46E5" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">CS Agent Dashboard</h2>
            <p className="text-sm text-[#64748B] max-w-sm text-center mb-6">
              Select a ticket from the sidebar to start helping a customer. New tickets appear automatically.
            </p>
            <div className="flex items-center gap-4 text-[10px] text-[#475569]">
              <span className="flex items-center gap-1"><Clock size={12} /> Auto-refresh</span>
              <span className="flex items-center gap-1"><MessageSquare size={12} /> Live chat</span>
              <span className="flex items-center gap-1"><Plane size={12} /> Book flights</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}