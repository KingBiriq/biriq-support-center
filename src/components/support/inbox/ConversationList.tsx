"use client";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { Search, Plus, RefreshCw, Filter } from "lucide-react";
import { ChannelBadge } from "@/components/ui/ChannelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') { if (typeof window !== 'undefined') window.location.href = '/login?clear=true'; return; }
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function ConversationList({ 
  onSelectConversation, 
  activeId 
}: { 
  onSelectConversation: (c: any) => void, 
  activeId?: string 
}) {
  const [filter, setFilter] = useState("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showPlusModal, setShowPlusModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Realtime approach: Polling via SWR as requested for MVP stability without exposing browser RLS
  const { data: conversations, error, isLoading } = useSWR(`/api/support/inbox?status=${filter}`, fetcher, { 
    refreshInterval: 2000,
    refreshWhenHidden: true 
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate(`/api/support/inbox?status=${filter}`);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/support/conversations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: newPhone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create conversation");
      }
      setShowPlusModal(false);
      setNewPhone("");
      await handleRefresh();
      if (data.conversation) {
        onSelectConversation(data.conversation);
      }
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const paramContactId = searchParams?.get("contact");
  const paramConvId = searchParams?.get("conversation");
  const paramOrderId = searchParams?.get("order");

  useEffect(() => {
    if (conversations && Array.isArray(conversations) && conversations.length > 0) {
      if (paramContactId) {
        const match = conversations.find((c: any) => c.support_contact_id === paramContactId || c.contact?.id === paramContactId);
        if (match) {
          onSelectConversation(match);
          return;
        }
      }
      if (paramConvId) {
        const match = conversations.find((c: any) => c.id === paramConvId);
        if (match) {
          onSelectConversation(match);
          return;
        }
      }
      if (paramOrderId) {
        const match = conversations.find((c: any) => c.meta?.order_id === paramOrderId || c.meta?.order_reference === paramOrderId || c.id === paramOrderId);
        if (match) {
          onSelectConversation(match);
          return;
        }
      }
    }
  }, [conversations, paramContactId, paramConvId, paramOrderId]);

  useEffect(() => {
    if (activeId && conversations && Array.isArray(conversations)) {
      const updatedActive = conversations.find((c: any) => c.id === activeId);
      if (updatedActive) {
        onSelectConversation(updatedActive);
      }
    }
  }, [conversations, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter conversations by search query
  const filteredConversations = Array.isArray(conversations) ? conversations.filter((c: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (c.support_contacts?.full_name || c.subject || "").toLowerCase();
    const phone = (c.support_contacts?.primary_phone || "").toLowerCase();
    const lastMsg = (c.last_message?.body || "").toLowerCase();
    return name.includes(q) || phone.includes(q) || lastMsg.includes(q);
  }) : [];

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 shrink-0 relative">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-xl text-slate-900 ml-10 md:ml-0">Inbox</h2>
          <div className="flex items-center space-x-1 text-slate-500">
            <button 
              onClick={() => setShowSearchInput(!showSearchInput)} 
              className={`p-1.5 rounded-md transition-colors ${showSearchInput ? 'bg-[#2b3890]/10 text-[#2b3890]' : 'hover:bg-slate-100'}`} 
              title="Search Conversations"
            >
              <Search size={18} />
            </button>
            <button 
              onClick={() => setShowPlusModal(true)} 
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors" 
              title="New WhatsApp Chat"
            >
              <Plus size={18} />
            </button>
            <button 
              onClick={handleRefresh} 
              className={`p-1.5 hover:bg-slate-100 rounded-md transition-colors ${isRefreshing ? 'animate-spin text-[#2b3890]' : ''}`} 
              title="Refresh Inbox"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        {showSearchInput && (
          <div className="mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Raadi magaca, nambarka ama farriinta..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2b3890]/20 focus:border-[#2b3890]"
              autoFocus
            />
          </div>
        )}
        
        {/* Filter Dropdown */}
        <div className="relative">
          <select 
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-10 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#2b3890]/20 focus:border-[#2b3890] transition-colors cursor-pointer"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Conversations</option>
            <option value="mine">Mine</option>
            <option value="unassigned">Unassigned</option>
            <option value="unread">Unread</option>
            <option disabled>───────</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="website">Website Chat</option>
            <option disabled>───────</option>
            <option value="open">Open</option>
            <option value="waiting">Waiting</option>
            <option value="pending">Pending</option>
            <option value="resolved">Solved</option>
            <option value="snoozed">Snoozed</option>
            <option value="closed">Closed</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
            <Filter size={14} />
          </div>
        </div>
      </div>

      {/* Start New WhatsApp Chat Modal */}
      {showPlusModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-lg text-slate-900 mb-1">Sheeko WhatsApp Cusub</h3>
            <p className="text-xs text-slate-500 mb-4">Geli nambarka WhatsApp-ka macmiilka si aad sheeko cusub uga bilaabdo.</p>
            
            <form onSubmit={handleStartNewChat} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nambarka Taleefanka</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Tusaale: 252616417528"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#2b3890]"
                  required
                  autoFocus
                />
              </div>

              {createError && (
                <p className="text-xs text-red-600 font-medium">{createError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlusModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Kansal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2b3890] hover:bg-[#20296b] rounded-lg transition-colors disabled:opacity-50"
                >
                  {creating ? "Furaya..." : "Biloow Sheeko"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List Area */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="p-4">
            <ErrorState message="Failed to load conversations" onRetry={handleRefresh} />
          </div>
        ) : isLoading || !conversations ? (
          <LoadingSkeleton lines={6} />
        ) : filteredConversations.length === 0 ? (
          <div className="p-6">
            <EmptyState 
              icon={Search} 
              title="No conversations" 
              description={searchQuery ? "No conversations found matching your search." : "No conversations found matching this filter."} 
            />
          </div>
        ) : !Array.isArray(conversations) ? (
          <div className="p-4">
            <ErrorState message={`API Error: ${conversations?.error || "Invalid data format received"}`} />
          </div>
        ) : (
          filteredConversations.map((c: any) => {
            const isActive = activeId === c.id;
            const isUnread = c.unread_count > 0;
            const isWhatsAppConv = (c.channel_type === 'website' && c.subject?.includes('WhatsApp')) || c.channel_type === 'whatsapp';
            const unreadColorClass = 'text-[#2b3890]';
            const unreadBgClass = 'bg-[#2b3890]';
            
            return (
              <div 
                key={c.id} 
                onClick={() => onSelectConversation(c)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors relative group
                  ${isActive 
                    ? 'bg-blue-50/50 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#2b3890]' 
                    : 'hover:bg-slate-50'
                  }
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center min-w-0 pr-2 pt-0.5">
                    <span className={`truncate text-sm ${isActive || isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {(() => {
                        let name = c.contact?.display_name || c.channel?.display_name || "Unknown Customer";
                        if (name === "Guest User" || name === "Unknown Customer" || name.startsWith("guest-")) {
                          const phone = c.contact?.primary_phone || c.channel?.external_contact_id;
                          if (phone && phone.startsWith("guest-")) {
                            return `Guest #${phone.substring(6, 10)}`;
                          }
                          if (c.contact?.primary_phone && !c.contact.primary_phone.startsWith("guest-")) return c.contact.primary_phone;
                          if (c.channel?.external_contact_id && !c.channel.external_contact_id.startsWith("guest-")) return c.channel.external_contact_id;
                          if (c.subject?.startsWith('WhatsApp: ')) return c.subject.replace('WhatsApp: ', '');
                        }
                        return name;
                      })()}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className={`text-[11px] whitespace-nowrap ${isUnread ? `${unreadColorClass} font-bold` : (isActive ? 'text-[#2b3890] font-medium' : 'text-slate-400')}`}>
                      {(() => {
                        const date = new Date(c.last_message_at || c.created_at);
                        const today = new Date();
                        const yesterday = new Date();
                        yesterday.setDate(today.getDate() - 1);

                        if (date.toDateString() === today.toDateString()) {
                          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } else if (date.toDateString() === yesterday.toDateString()) {
                          return "Yesterday";
                        } else {
                          return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
                        }
                      })()}
                    </span>
                    {isUnread && (
                      <span className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full ${unreadBgClass} text-white text-[10px] font-bold leading-none shadow-sm`}>
                        {c.unread_count > 99 ? '99+' : c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-slate-500 truncate mb-2.5 leading-snug">
                  {c.subject || "Started a new conversation..."}
                </div>
                
                <div className="flex items-center gap-2 overflow-hidden">
                  <ChannelBadge 
                    channelType={isWhatsAppConv ? 'whatsapp' : c.channel_type} 
                    showLabel={false} 
                    size="sm" 
                    className="shrink-0" 
                  />
                  <StatusBadge status={c.status} size="sm" />
                  
                  {/* Order ID Badge (Optional) */}
                  {c.metadata?.linked_order_id && (
                    <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 truncate">
                      {c.metadata.linked_order_id}
                    </span>
                  )}
                  
                  {/* Tags */}
                  {(c.support_conversation_tags || []).map((tagRel: any) => (
                    <span 
                      key={tagRel.support_tags?.id}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded border truncate"
                      style={{ 
                        backgroundColor: `${tagRel.support_tags?.color}15`, 
                        color: tagRel.support_tags?.color,
                        borderColor: `${tagRel.support_tags?.color}30`
                      }}
                    >
                      {tagRel.support_tags?.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
