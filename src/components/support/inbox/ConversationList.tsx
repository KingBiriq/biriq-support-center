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
  
  // Realtime approach: Polling via SWR as requested for MVP stability without exposing browser RLS
  const { data: conversations, error, isLoading } = useSWR(`/api/support/inbox?status=${filter}`, fetcher, { 
    refreshInterval: 2000 
  });

  const handleRefresh = () => {
    mutate(`/api/support/inbox?status=${filter}`);
  };

  useEffect(() => {
    if (activeId && conversations) {
      const updatedActive = conversations.find((c: any) => c.id === activeId);
      if (updatedActive) {
        // We only want to trigger the update if something actually changed.
        // For simplicity in this demo, we'll just push the new object up, 
        // but to avoid infinite loops, the parent should be okay with identity changes.
        onSelectConversation(updatedActive);
      }
    }
  }, [conversations, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 shrink-0 relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl text-slate-900 ml-10 md:ml-0">Inbox</h2>
          <div className="flex items-center space-x-1 text-slate-500">
            <button className="p-1.5 hover:bg-slate-100 rounded-md transition-colors" title="Search">
              <Search size={18} />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded-md transition-colors" title="New Conversation">
              <Plus size={18} />
            </button>
            <button onClick={handleRefresh} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors" title="Refresh">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
        
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
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
            <Filter size={14} />
          </div>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="p-4">
            <ErrorState message="Failed to load conversations" onRetry={handleRefresh} />
          </div>
        ) : isLoading || !conversations ? (
          <LoadingSkeleton lines={6} />
        ) : conversations.length === 0 ? (
          <div className="p-6">
            <EmptyState 
              icon={Search} 
              title="No conversations" 
              description="No conversations found matching this filter." 
            />
          </div>
        ) : !Array.isArray(conversations) ? (
          <div className="p-4">
            <ErrorState message={`API Error: ${conversations?.error || "Invalid data format received"}`} />
          </div>
        ) : (
          conversations.map((c: any) => {
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
