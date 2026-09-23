"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  X, 
  Send, 
  Minus, 
  Headphones, 
  ShieldCheck, 
  Check, 
  Sparkles,
  ArrowUp
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "member" | "operator";
  message: string;
  created_at: string;
  is_read?: boolean;
}

interface FloatingChatMessengerProps {
  currentUser: {
    id: string;
    name: string;
  };
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function FloatingChatMessenger({
  currentUser,
  isOpen: controlledIsOpen,
  onOpenChange
}: FloatingChatMessengerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalIsOpen(value);
    }
    if (value) {
      setIsMinimized(false);
      setUnreadCount(0);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initial fetch messages
  useEffect(() => {
    if (!currentUser?.id) return;

    let isMounted = true;
    const fetchChatHistory = async () => {
      try {
        const res = await fetch(`/api/chat/messages?sender_id=${encodeURIComponent(currentUser.id)}`);
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          if (json.data.length > 0) {
            setMessages(json.data);
          } else {
            // Default welcoming message from operator
            setMessages([
              {
                id: "welcome-op-1",
                sender_id: "operator-system",
                sender_name: "Kasir GC-Net",
                sender_role: "operator",
                message: "Halo bro, ada kendala seputar billing, reservasi PC, atau butuh bantuan kasir? Tulis pesan di sini ya.",
                created_at: new Date().toISOString(),
                is_read: true
              }
            ]);
          }
        }
      } catch {
        // Fallback default welcoming message
        if (isMounted && messages.length === 0) {
          setMessages([
            {
              id: "welcome-op-1",
              sender_id: "operator-system",
              sender_name: "Kasir GC-Net",
              sender_role: "operator",
              message: "Halo bro, ada kendala seputar billing, reservasi PC, atau butuh bantuan kasir? Tulis pesan di sini ya.",
              created_at: new Date().toISOString(),
              is_read: true
            }
          ]);
        }
      }
    };

    fetchChatHistory();

    // Supabase Realtime channel subscription
    const channel = supabase
      .channel("public:chat_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages"
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (!isOpen && newMsg.sender_role === "operator") {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, isOpen]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || loading || !currentUser?.id) return;

    setInputText("");
    const optimisticId = `local-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      sender_id: currentUser.id,
      sender_name: currentUser.name || "Member",
      sender_role: "member",
      message: trimmed,
      created_at: new Date().toISOString()
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      setLoading(true);
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: currentUser.id,
          sender_name: currentUser.name || "Member",
          sender_role: "member",
          message: trimmed
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMessages((prev) => 
          prev.map((msg) => (msg.id === optimisticId ? json.data : msg))
        );
      }
    } catch {
      // Keep optimistic message displayed
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── FLOATING LAUNCHER BUTTON (Bottom-Right) ── */}
      <AnimatePresence>
        {(!isOpen || isMinimized) && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40"
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setIsMinimized(false);
              }}
              className="group relative flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-zinc-950 border border-nvidia-green/40 hover:border-nvidia-green text-white shadow-[0_8px_25px_rgba(0,0,0,0.8),0_0_20px_rgba(118,185,0,0.25)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.9),0_0_30px_rgba(118,185,0,0.45)] transition-all duration-300 active:scale-95"
              aria-label="Buka Obrolan Kasir"
            >
              {/* Online indicator ping */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nvidia-green opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-nvidia-green" />
              </span>

              <div className="flex items-center gap-2">
                <Headphones size={17} className="text-nvidia-green group-hover:rotate-12 transition-transform duration-300" />
                <span className="text-xs sm:text-sm font-black tracking-wide uppercase">
                  Chat Kasir
                </span>
              </div>

              {/* Unread Message Pill Badge */}
              {unreadCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-nvidia-green text-black text-[10px] font-mono font-black animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL CHAT DOCK (Desktop: Floating Bottom-Right, Mobile: Bottom Sheet Drawer) ── */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <>
            {/* Mobile Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 sm:hidden"
            />

            {/* Chat Container */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 top-16 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-[380px] sm:h-[500px] flex flex-col bg-zinc-950/95 border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(118,185,0,0.12)] backdrop-blur-xl overflow-hidden"
            >
              {/* Header Chat: Status Operator & Action Buttons */}
              <div className="flex items-center justify-between px-4 py-3.5 sm:px-4 sm:py-3 border-b border-white/10 bg-zinc-900/80">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/20 flex items-center justify-center text-nvidia-green shadow-sm">
                      <Headphones size={18} />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-nvidia-green ring-2 ring-zinc-950" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                        Operator Kasir
                      </h4>
                      <span className="text-[10px] font-mono font-bold text-nvidia-green px-1.5 py-0.2 rounded bg-nvidia-green/10 border border-nvidia-green/30">
                        Online
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-medium">
                      Bantuan Langsung GC-Net Warnet
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Minimize Button */}
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                    title="Kecilkan Chat"
                    aria-label="Kecilkan Chat"
                  >
                    <Minus size={16} />
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                    title="Tutup Chat"
                    aria-label="Tutup Chat"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Body: Scrollable Message Bubbles */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 scroll-smooth">
                {messages.map((msg) => {
                  const isUser = msg.sender_role === "member";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          {isUser ? "Anda" : msg.sender_name}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">
                          {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 text-xs sm:text-sm font-medium leading-relaxed break-words shadow-md ${
                          isUser
                            ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl rounded-tr-xs"
                            : "bg-zinc-900 border border-white/10 text-zinc-200 rounded-2xl rounded-tl-xs"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Footer: Input Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-white/10 bg-zinc-900/90 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Tulis pesan ke kasir..."
                  className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-nvidia-green transition"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || loading}
                  className="p-2.5 rounded-xl bg-nvidia-green hover:bg-emerald-400 text-black font-bold disabled:opacity-30 disabled:pointer-events-none transition active:scale-95 shrink-0"
                  aria-label="Kirim Pesan"
                >
                  <ArrowUp size={18} />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
