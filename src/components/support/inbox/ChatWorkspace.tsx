"use client";
import { useState, useRef, useEffect } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import WhatsAppComposer from "./WhatsAppComposer";
import ConversationTags from "./ConversationTags";
import StaffAssignment from "./StaffAssignment";
import { MessageBubble, InternalNoteBubble } from "@/components/ui/MessageBubble";
import { ChannelBadge } from "@/components/ui/ChannelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ArrowLeft, MoreVertical, Tag, CheckCircle2, UserRound, PanelRightClose, PanelRightOpen } from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') { if (typeof window !== 'undefined') window.location.href = '/login?clear=true'; return; }
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  
  // Deduplicate messages by ID to prevent double rendering in UI
  const data = json.data || [];
  const seen = new Set();
  return data.filter((msg: any) => {
    if (seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });
};

interface ChatWorkspaceProps {
  conversation: any;
  onBack?: () => void;
  onClose?: () => void;
  onTogglePanel?: () => void;
  showPanelActive?: boolean;
}

export default function ChatWorkspace({ conversation, onBack, onClose, onTogglePanel, showPanelActive }: ChatWorkspaceProps) {
  const [noteBody, setNoteBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composerMode, setComposerMode] = useState<'reply'|'internal'>('reply');
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Local overrides for instant UI feedback
  const [localStatus, setLocalStatus] = useState(conversation.status);
  const [localAiStatus, setLocalAiStatus] = useState(conversation.ai_status);

  useEffect(() => {
    setLocalStatus(conversation.status);
    setLocalAiStatus(conversation.ai_status);
  }, [conversation.id, conversation.status, conversation.ai_status]);

  const { data: messages, mutate } = useSWR(`/api/support/messages?conversationId=${conversation.id}`, fetcher, {
    refreshInterval: 1000,
    refreshWhenHidden: true
  });

  useEffect(() => {
    // Only scroll smoothly if messages actually changed length or we just loaded
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  useEffect(() => {
    // Automatically mark the conversation as read when opened by the admin
    if (conversation?.id && conversation.unread_count !== 0) {
      fetch(`/api/support/conversations/${conversation.id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' })
      }).then(() => {
        globalMutate((key: any) => typeof key === 'string' && key.startsWith('/api/support/inbox'));
      }).catch(console.error);
    }
  }, [conversation?.id, conversation?.unread_count]);

  const sendInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setIsSending(true);
    try {
      await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          body: noteBody,
          isInternal: true
        })
      });
      setNoteBody("");
      mutate();
      globalMutate((key: any) => typeof key === 'string' && key.startsWith('/api/support/inbox'));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative w-full">
      {/* Header */}
      <div className="h-[72px] border-b border-slate-200 bg-white flex items-center px-4 justify-between shrink-0 z-10">
        <div className="flex items-center min-w-0">
          {/* Mobile Back Button */}
          {onBack && (
            <button onClick={onBack} className="md:hidden mr-3 p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
              <ArrowLeft size={20} />
            </button>
          )}
          
          <div className="flex flex-col min-w-0">
            <h3 className="font-bold text-slate-900 text-lg truncate flex items-center gap-2">
              {(() => {
                let name = conversation.contact?.display_name || conversation.channel?.display_name || "Unknown Customer";
                if (name === "Guest User" || name === "Unknown Customer" || name.startsWith("guest-")) {
                  const phone = conversation.contact?.primary_phone || conversation.channel?.external_contact_id;
                  if (phone && phone.startsWith("guest-")) {
                    return `Guest #${phone.substring(6, 10)}`;
                  }
                  if (conversation.contact?.primary_phone && !conversation.contact.primary_phone.startsWith("guest-")) return conversation.contact.primary_phone;
                  if (conversation.channel?.external_contact_id && !conversation.channel.external_contact_id.startsWith("guest-")) return conversation.channel.external_contact_id;
                  if (conversation.subject?.startsWith('WhatsApp: ')) return conversation.subject.replace('WhatsApp: ', '');
                }
                return name;
              })()}
              <StatusBadge status={localStatus} />
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <ChannelBadge channelType={(conversation.channel_type === 'website' && conversation.subject?.includes('WhatsApp')) ? 'whatsapp' : conversation.channel_type} size="sm" />
              <span className="truncate">
                {(() => {
                  let phone = conversation.contact?.primary_phone || conversation.channel?.external_contact_id;
                  if (phone && phone.startsWith("guest-")) {
                    if (conversation.subject?.startsWith('WhatsApp: ')) {
                      return conversation.subject.replace('WhatsApp: ', '');
                    }
                    return "guest-" + phone.substring(6, 10);
                  }
                  return phone || "Unknown Number";
                })()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 ml-2 sm:ml-4">
          {/* Assign / Agent Badge - Hidden on mobile */}
          <div className="hidden sm:block">
            <StaffAssignment conversation={conversation} />
          </div>
          
          {/* AI Toggle Button */}
          {localAiStatus === 'human_takeover' ? (
            <button 
              onClick={async () => {
                setLocalAiStatus('ai_active');
                try {
                  await fetch(`/api/support/conversations/${conversation.id}/action`, { 
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'return_to_ai' }) 
                  });
                  globalMutate((key: any) => typeof key === 'string' && key.startsWith('/api/support/inbox'));
                } catch(e) { setLocalAiStatus('human_takeover'); }
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md transition-colors whitespace-nowrap">
              Return to AI
            </button>
          ) : (
            <button 
              onClick={async () => {
                setLocalAiStatus('human_takeover');
                try {
                  await fetch(`/api/support/conversations/${conversation.id}/action`, { 
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'ai_takeover' }) 
                  });
                  globalMutate((key: any) => typeof key === 'string' && key.startsWith('/api/support/inbox'));
                } catch(e) { setLocalAiStatus(conversation.ai_status); }
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-md transition-colors whitespace-nowrap">
              Take Over
            </button>
          )}

          <button 
            onClick={async () => {
              setLocalStatus('resolved');
              try {
                await fetch(`/api/support/conversations/${conversation.id}/action`, { 
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'resolve' }) 
                });
                globalMutate((key: any) => typeof key === 'string' && key.startsWith('/api/support/inbox'));
              } catch(e) { setLocalStatus(conversation.status); }
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors">
            <CheckCircle2 size={16} />
            <span className="hidden md:inline">Solve</span>
          </button>

          <select 
            className="hidden sm:flex text-sm border border-slate-200 rounded-md py-1.5 px-2 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
            value=""
            onChange={async (e) => {
              const action = e.target.value;
              if (!action) return;
              
              let payload: any = undefined;
              if (action === 'snooze') {
                 const tomorrow = new Date();
                 tomorrow.setDate(tomorrow.getDate() + 1);
                 payload = { until: tomorrow.toISOString() };
              }
              
              if (!confirm(`Are you sure you want to perform this action: ${action}?`)) {
                e.target.value = "";
                return;
              }

              try {
                await fetch(`/api/support/conversations/${conversation.id}/action`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action, payload })
                });
                globalMutate((key: any) => typeof key === 'string' && key.startsWith('/api/support/inbox'));
              } catch(err) {
                console.error(err);
              } finally {
                if (action === 'close' || action === 'archive' || action === 'spam') {
                  onClose?.();
                } else if (action === 'resolve') {
                  setLocalStatus('resolved');
                } else if (action === 'reopen') {
                  setLocalStatus('open');
                }
              }
              e.target.value = "";
            }}
          >
            <option value="" disabled>More actions...</option>
            {conversation.assigned_agent_id && <option value="unassign">Unassign</option>}
            {['closed', 'resolved'].includes(localStatus) ? (
              <option value="reopen">Reopen</option>
            ) : (
              <option value="close">Close</option>
            )}
            <option value="snooze">Snooze (1 Day)</option>
            <option value="spam">Mark as Spam</option>
            <option value="set_priority">Set High Priority</option>
          </select>

          {/* Native Mobile Actions Dropdown (Replaces desktop buttons on small screens) */}
          <div className="sm:hidden relative flex items-center justify-center">
            <select 
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              value=""
              onChange={async (e) => {
                const action = e.target.value;
                if (!action) return;
                
                let payload: any = undefined;
                if (action === 'snooze') {
                   const tomorrow = new Date();
                   tomorrow.setDate(tomorrow.getDate() + 1);
                   payload = { until: tomorrow.toISOString() };
                }
                
                if (!confirm(`Are you sure you want to perform this action: ${action}?`)) {
                  e.target.value = "";
                  return;
                }

                if (action === 'return_to_ai') {
                  setLocalAiStatus('ai_active');
                } else if (action === 'ai_takeover') {
                  setLocalAiStatus('human_takeover');
                }

                try {
                  await fetch(`/api/support/conversations/${conversation.id}/action`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: ['return_to_ai', 'ai_takeover'].includes(action) ? action : action, payload })
                  });
                  globalMutate((key: any) => typeof key === 'string' && key.startsWith('/api/support/inbox'));
                } catch(err) {
                  console.error(err);
                } finally {
                  if (action === 'close' || action === 'archive' || action === 'spam') {
                    onClose?.();
                  } else if (action === 'resolve') {
                    setLocalStatus('resolved');
                  } else if (action === 'reopen') {
                    setLocalStatus('open');
                  }
                }
                e.target.value = "";
              }}
            >
              <option value="" disabled>Actions...</option>
              {localAiStatus === 'human_takeover' ? (
                <option value="return_to_ai">Return to AI</option>
              ) : (
                <option value="ai_takeover">Take Over from AI</option>
              )}
              <option value="resolve">Solve</option>
              {conversation.assigned_agent_id && <option value="unassign">Unassign</option>}
              {['closed', 'resolved'].includes(localStatus) ? (
                <option value="reopen">Reopen</option>
              ) : (
                <option value="close">Close</option>
              )}
              <option value="snooze">Snooze (1 Day)</option>
              <option value="spam">Mark as Spam</option>
            </select>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
              <MoreVertical size={20} />
            </button>
          </div>

          {/* Toggle Customer Panel Button */}
          {onTogglePanel && (
            <button 
              onClick={onTogglePanel}
              className={`p-2 rounded-md transition-colors ${showPanelActive ? 'bg-[#2b3890]/10 text-[#2b3890]' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Toggle Customer Info"
            >
              {showPanelActive ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 relative bg-[#efeae2]"
        style={{
          backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "400px",
          backgroundBlendMode: "overlay"
        }}
      >
        {!messages ? (
          <div className="flex justify-center p-4">
            <div className="animate-pulse bg-white border border-slate-200 h-10 w-32 rounded-full"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ChannelBadge channelType={(conversation.channel_type === 'website' && conversation.subject?.includes('WhatsApp')) ? 'whatsapp' : conversation.channel_type} showLabel={false} size="lg" />
            </div>
            <p>No messages in this conversation yet.</p>
          </div>
        ) : (
          <>
            <div className="text-center my-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative bg-[#f8f9fa] px-4 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                Beginning of Conversation
              </span>
            </div>
            
            {messages.map((msg: any) => {
              if (msg.is_internal) {
                return <InternalNoteBubble key={msg.id} message={msg} />;
              }
              return <MessageBubble key={msg.id} message={msg} channelType={(conversation.channel_type === 'website' && conversation.subject?.includes('WhatsApp')) ? 'whatsapp' : conversation.channel_type} />;
            })}
          </>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Composer Area */}
      <div className="flex flex-col border-t border-slate-200 bg-white shrink-0">
        {/* Tabs */}
        <div className="flex px-4 pt-2 border-b border-slate-100 space-x-1">
          <button 
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              composerMode === 'reply' 
                ? 'bg-white text-[#2b3890] border-t border-x border-slate-200 relative top-[1px]' 
                : 'text-slate-500 hover:bg-slate-50 border-t border-x border-transparent'
            }`}
            onClick={() => setComposerMode('reply')}
          >
            Reply
          </button>
          <button 
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              composerMode === 'internal' 
                ? 'bg-amber-50 text-amber-700 border-t border-x border-amber-200 relative top-[1px]' 
                : 'text-slate-500 hover:bg-slate-50 border-t border-x border-transparent'
            }`}
            onClick={() => setComposerMode('internal')}
          >
            Internal Note
          </button>
        </div>

        <div className="p-4 pt-3">
          {composerMode === 'internal' ? (
            <form onSubmit={sendInternalNote} className="flex flex-col gap-3">
              <div className="relative">
                <textarea 
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Type an internal note (only visible to your team)..." 
                  className="w-full min-h-[80px] border border-amber-200 bg-amber-50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder-amber-400 text-amber-900 resize-none"
                  disabled={isSending}
                />
              </div>
              <div className="flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSending || !noteBody.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSending ? 'Saving...' : 'Add Internal Note'}
                </button>
              </div>
            </form>
          ) : (
            <WhatsAppComposer conversation={conversation} onMessageSent={mutate} />
          )}
        </div>
      </div>
    </div>
  );
}
