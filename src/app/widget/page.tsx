"use client";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Send, X, MessageSquare, Loader2 } from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function WidgetPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let id = localStorage.getItem("biriq_widget_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("biriq_widget_device_id", id);
    }
    setDeviceId(id);
    
    // Auto-init if they open the widget or already have a conversation in memory
    const savedConv = localStorage.getItem("biriq_widget_conv_id");
    if (savedConv) setConversationId(savedConv);
  }, []);

  const initConversation = async () => {
    if (conversationId) return;
    try {
      const res = await fetch("/api/widget/conversations/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId })
      });
      const json = await res.json();
      if (json.success) {
        setConversationId(json.data.conversationId);
        localStorage.setItem("biriq_widget_conv_id", json.data.conversationId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const { data: messages, mutate } = useSWR(
    conversationId && isOpen ? `/api/widget/conversations/${conversationId}/messages` : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen && !conversationId) {
      initConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !conversationId) return;
    setIsSending(true);
    try {
      await fetch(`/api/widget/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, body })
      });
      setBody("");
      mutate();
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-105"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center shrink-0">
        <div>
          <h3 className="font-bold">Biriq Support</h3>
          <p className="text-xs text-blue-100">We typically reply in a few minutes.</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white hover:text-blue-200 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col space-y-3">
        {!messages ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 my-auto text-sm">
            Send us a message to start the conversation.
          </div>
        ) : (
          messages.map((msg: any) => (
            <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.direction === 'incoming' ? 'self-end items-end' : 'self-start items-start'}`}>
              {msg.direction === 'outgoing' && msg.support_staff && (
                 <span className="text-[10px] text-slate-500 ml-1 mb-1">{msg.support_staff.first_name}</span>
              )}
              <div className={`p-3 rounded-2xl text-sm ${
                msg.direction === 'incoming' 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-white border border-slate-200 text-slate-900 rounded-tl-sm'
              }`}>
                {msg.body}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={sendMessage} className="relative flex items-center">
          <input 
            type="text"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Type your message..."
            className="w-full bg-slate-100 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            disabled={isSending || !conversationId}
          />
          <button 
            type="submit"
            disabled={isSending || !body.trim() || !conversationId}
            className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 transition-colors"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
