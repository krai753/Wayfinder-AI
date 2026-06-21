import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Phone, X, Send, Clock, CheckCircle, AlertCircle, User, HeadphonesIcon } from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || "https://139.180.203.171:8000/api";

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
}

interface Message {
  id: number;
  ticket_id: string;
  sender: string;
  message: string;
  created_at: string;
}

export default function CSDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [notifications, setNotifications] = useState(0);
  const [agentName, setAgentName] = useState("Agent Smith");
  const [editingName, setEditingName] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    // Auto-assign if unassigned
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
        {/* Header */}
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

        {/* Ticket List */}
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
                  <span className="text-sm font-semibold text-white truncate flex-1">
                    {ticket.user_name}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      background: `${statusColor(ticket.status)}15`,
                      color: statusColor(ticket.status),
                      border: `1px solid ${statusColor(ticket.status)}25`,
                    }}
                  >
                    {statusLabel(ticket.status)}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] truncate">
                  {ticket.last_message || ticket.issue || "No messages yet"}
                </p>
                <p className="text-[9px] text-[#475569] mt-1">{timeAgo(ticket.created_at)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── CHAT AREA ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {activeTicket ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(79,70,229,0.15)" }}>
                <User size={16} color="#4F46E5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{activeTicket.user_name}</p>
                <p className="text-[10px] text-[#64748B]">Ticket: {activeTicket.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-1 rounded text-[10px] font-bold"
                  style={{
                    background: `${statusColor(activeTicket.status)}15`,
                    color: statusColor(activeTicket.status),
                    border: `1px solid ${statusColor(activeTicket.status)}25`,
                  }}
                >
                  {statusLabel(activeTicket.status)}
                </span>
                <button
                  onClick={closeTicket}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}
                >
                  <CheckCircle size={14} className="inline mr-1" /> Resolve
                </button>
                <button
                  onClick={() => setActiveTicket(null)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  <X size={16} color="#64748B" />
                </button>
              </div>
            </div>

            {/* Messages */}
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
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                      msg.sender === "agent"
                        ? "rounded-tr-md"
                        : "rounded-tl-md"
                    }`}
                    style={
                      msg.sender === "agent"
                        ? { background: "linear-gradient(135deg,#4F46E5,#6366f1)" }
                        : msg.sender === "system"
                        ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }
                        : { background: "rgba(255,255,255,0.08)" }
                    }
                  >
                    <p className={`text-sm ${msg.sender === "system" ? "text-[#64748B] italic" : "text-white"}`}>
                      {msg.message}
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

            {/* Message Input */}
            <div className="px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "rgba(21,28,47,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type your response..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#64748B] focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
                  style={{ background: messageInput.trim() ? "linear-gradient(135deg,#4F46E5,#6366f1)" : "transparent" }}
                >
                  <Send size={16} color="#fff" />
                </button>
              </div>
            </div>
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
              <span className="flex items-center gap-1"><AlertCircle size={12} /> Notifications</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}