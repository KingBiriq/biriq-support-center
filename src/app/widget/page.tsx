"use client";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Send, X, MessageSquare, Loader2 } from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') { if (typeof window !== 'undefined') window.location.href = '/login?clear=true'; return; }
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

  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ticketData, setTicketData] = useState({ category: 'Top up/Delivery Issues', body: '', email: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMenuClick = (action: string) => {
    setShowPlusMenu(false);
    if (action === 'album') {
      fileInputRef.current?.click();
    } else if (action === 'quick_question') {
      setShowQuickQuestions(true);
    } else if (action === 'contact_platform') {
      setBody("I need to contact the platform.");
    } else if (action === 'new_ticket') {
      setShowNewTicket(true);
    }
  };

  const sendQuickQuestion = async (q: string) => {
    setShowQuickQuestions(false);
    if (!conversationId) return;
    setIsSending(true);
    try {
      await fetch(`/api/widget/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, body: q })
      });
      mutate();
    } finally {
      setIsSending(false);
    }
  };

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketData.body.trim()) return;
    setIsSending(true);
    try {
      const formattedBody = `[Tikad Cusub]\nNooca Cabashada: ${ticketData.category}\nEmail/Taleefoon: ${ticketData.email}\n\nFaahfaahinta: ${ticketData.body}`;
      await fetch(`/api/widget/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, body: formattedBody })
      });
      setShowNewTicket(false);
      setTicketData({ category: 'Cillad xaga lacag shubista/bixinta', body: '', email: '' });
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
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col space-y-3 relative">
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
      <div className="relative p-3 bg-white border-t border-slate-100 shrink-0">
        {/* Plus Menu Popup */}
        {showPlusMenu && (
          <div className="absolute bottom-[70px] left-3 bg-white border border-slate-200 shadow-xl rounded-xl p-3 w-[300px] z-50">
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => handleMenuClick('quick_question')} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">Quick<br/>Question</span>
              </button>
              
              <button onClick={() => handleMenuClick('album')} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
                <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">Album</span>
              </button>
              
              <button onClick={() => handleMenuClick('contact_platform')} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">Contact<br/>Platform</span>
              </button>

              <button onClick={() => handleMenuClick('new_ticket')} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="18" y2="12"/><line x1="9" x2="15" y1="15" y2="15"/></svg>
                </div>
                <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">New<br/>Ticket</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Questions Popup */}
        {showQuickQuestions && (
          <div className="absolute bottom-[70px] left-3 bg-white border border-slate-200 shadow-xl rounded-t-xl p-0 w-[320px] z-50 overflow-hidden flex flex-col max-h-[300px]">
            <div className="flex justify-between items-center p-3 border-b border-slate-100 bg-slate-50">
              <span className="text-sm font-semibold text-slate-700">Quick Question</span>
              <button onClick={() => setShowQuickQuestions(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="p-3 bg-white">
              <p className="text-[10px] text-slate-400 mb-2">Click on the following questions to quickly ask the seller:</p>
              <div className="flex flex-col gap-2 overflow-y-auto">
                <button 
                  onClick={() => sendQuickQuestion("Lacagta waan bixiyay, fadlan iigu shub sida ugu dhaqsaha badan.")} 
                  className="text-left text-xs p-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Lacagta waan bixiyay, fadlan iigu shub sida ugu dhaqsaha badan.
                </button>
                <button 
                  onClick={() => sendQuickQuestion("Maxaa keenay in dalabkii aan iibsaday uusan weli ciyaarta iigu soo dhicin?")} 
                  className="text-left text-xs p-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Maxaa keenay in dalabkii aan iibsaday uusan weli ciyaarta iigu soo dhicin?
                </button>
                <button 
                  onClick={() => sendQuickQuestion("Waxaan codsaday in lacagtaydii la ii soo celiyo, fadlan si degdeg ah uga shaqee.")} 
                  className="text-left text-xs p-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Waxaan codsaday in lacagtaydii la ii soo celiyo, fadlan si degdeg ah uga shaqee.
                </button>
              </div>
            </div>
          </div>
        )}

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
        
        <form onSubmit={sendMessage} className="relative flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors border border-slate-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          </button>
          
          <div className="relative flex-1">
            <input 
              type="text"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type your message..."
              className="w-full bg-slate-100 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              disabled={isSending || !conversationId}
              onFocus={() => setShowPlusMenu(false)}
            />
            <button 
              type="submit"
              disabled={isSending || !body.trim() || !conversationId}
              className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 transition-colors"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
