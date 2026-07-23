"use client";
import { useState } from "react";
import { X, ExternalLink, MapPin, Mail, Globe, Clock, Package, CreditCard, Activity } from "lucide-react";
import { ServiceWindowCard } from "@/components/ui/ServiceWindowCard";
import { ChannelBadge } from "@/components/ui/ChannelBadge";

import ConversationTags from "./ConversationTags";
import { StatusBadge } from "@/components/ui/StatusBadge";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') { if (typeof window !== 'undefined') window.location.href = '/login?clear=true'; return; }
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function CustomerPanel({ conversation, onClose }: { conversation: any, onClose?: () => void }) {
  const [tab, setTab] = useState<'profile'|'orders'|'payments'|'notes'|'ai_context'>('profile');
  const contact = conversation.contact || {};
  const meta = conversation.meta || {};

  const displayPhone = (() => {
    let phone = contact.primary_phone;
    if (phone && phone.startsWith("guest-") && conversation.subject?.startsWith('WhatsApp: ')) {
      return conversation.subject.replace('WhatsApp: ', '');
    }
    return phone || conversation.channel?.external_contact_id || conversation.channel?.identifier;
  })();

  const displayName = (() => {
    let name = contact.display_name || conversation.channel?.display_name || "Unknown Customer";
    if (name === "Guest User" || name === "Unknown Customer" || name.startsWith("guest-")) {
      if (displayPhone && !displayPhone.startsWith("guest-")) return displayPhone;
      if (displayPhone && displayPhone.startsWith("guest-")) {
        return `Guest #${displayPhone.substring(6, 10)}`;
      }
    }
    return name;
  })();

  return (
    <div className="flex flex-col h-full bg-white w-full">
      {/* Header */}
      <div className="p-6 text-center border-b border-slate-200 bg-slate-50 relative flex flex-col items-center shrink-0">
        {onClose && (
          <button 
            onClick={onClose} 
            className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md xl:hidden"
          >
            <X size={18} />
          </button>
        )}
        
        <div className="w-[84px] h-[84px] bg-indigo-100 text-[#2b3890] rounded-full flex items-center justify-center text-3xl font-bold mb-3 border-[3px] border-white shadow-sm">
          {displayName.charAt(0)?.toUpperCase() || '?'}
        </div>
        <h2 className="font-bold text-lg text-slate-900 mb-1">
          {displayName}
        </h2>
        <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500 mb-3">
          <ChannelBadge channelType={(conversation.channel_type === 'website' && conversation.subject?.includes('WhatsApp')) ? 'whatsapp' : conversation.channel_type} showLabel={false} size="sm" />
          <span>{displayPhone || "Unknown ID"}</span>
        </div>
        <div className="flex gap-2 mb-3">
          {contact.vip_status && <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded border border-amber-200 font-bold uppercase tracking-wide">VIP</span>}
          <span className="bg-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded border border-slate-300 font-bold uppercase tracking-wide">{contact.lifecycle || 'Lead'}</span>
        </div>
        
        {/* Tags */}
        <div className="w-full flex justify-center">
          <ConversationTags conversation={conversation} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-sm overflow-x-auto no-scrollbar shrink-0">
        {['profile', 'orders', 'payments', 'ai_context', 'notes'].map((t) => (
          <button 
            key={t}
            onClick={() => setTab(t as any)} 
            className={`flex-1 min-w-[70px] py-3.5 px-2 font-medium border-b-[3px] transition-colors capitalize text-center ${
              tab === t ? 'border-[#2b3890] text-[#2b3890]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 text-sm bg-white">
        {tab === 'profile' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-slate-400 mt-0.5" />
                <div>
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">Email</label>
                  <div className="text-slate-800 font-medium">{contact.primary_email || "Not provided"}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-slate-400 mt-0.5" />
                <div>
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">Location</label>
                  <div className="text-slate-800 font-medium">{[contact.city, contact.country].filter(Boolean).join(", ") || "Unknown"}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe size={16} className="text-slate-400 mt-0.5" />
                <div>
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">Language</label>
                  <div className="text-slate-800 font-medium capitalize">{contact.language || "Unknown"}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock size={16} className="text-slate-400 mt-0.5" />
                <div>
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">Customer Since</label>
                  <div className="text-slate-800 font-medium">
                    {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : "Unknown"}
                  </div>
                </div>
              </div>
            </div>

            {/* Channels List */}
            <div className="pt-5 border-t border-slate-100">
              <h4 className="font-semibold text-slate-800 mb-3 text-sm">Linked Channels</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <ChannelBadge channelType={(conversation.channel_type === 'website' && conversation.subject?.includes('WhatsApp')) ? 'whatsapp' : conversation.channel_type} showLabel={false} />
                    <span className="font-medium text-slate-700 text-xs">{displayPhone}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase">Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-800">Customer Orders</h4>
              <button className="text-xs text-[#2b3890] hover:underline font-medium flex items-center">
                Link Order <ExternalLink size={12} className="ml-1" />
              </button>
            </div>
            <CustomerOrders phone={displayPhone} conversationId={conversation.id} />
          </div>
        )}

        {tab === 'payments' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-800">Customer Payments</h4>
            </div>
            <CustomerPayments phone={displayPhone} />
          </div>
        )}

        {tab === 'ai_context' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-800">AI Context</h4>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">AI Summary</label>
                <div className="text-slate-800 text-sm whitespace-pre-wrap">{meta.ai_summary || 'No summary available.'}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">Intent</label>
                  <div className="text-slate-800 font-medium capitalize">{meta.intent?.replace('_', ' ') || 'Unknown'}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">Status</label>
                  <div className="text-slate-800 font-medium capitalize flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${conversation.ai_status === 'ai_active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {conversation.ai_status?.replace('_', ' ') || 'Inactive'}
                  </div>
                </div>
              </div>

              {meta.escalation_reason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <label className="text-[11px] text-rose-500 uppercase tracking-wider font-semibold block mb-1">Escalation Reason</label>
                  <div className="text-rose-900 text-sm">{meta.escalation_reason}</div>
                </div>
              )}

              {Array.isArray(meta.checks_completed) && meta.checks_completed.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">Checks Completed</label>
                  <ul className="space-y-1">
                    {meta.checks_completed.map((check: string, i: number) => (
                      <li key={i} className="text-slate-700 text-xs flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span>{check}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div className="flex flex-col h-full">
            <h4 className="font-semibold text-slate-800 mb-4">Customer Notes</h4>
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center px-4">
              <Activity size={32} className="mb-3 opacity-50" />
              <p className="text-sm">No profile notes found.</p>
              <button className="mt-4 px-4 py-2 border border-slate-300 rounded-md text-slate-700 text-xs font-medium hover:bg-slate-50">
                Add Profile Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerOrders({ phone, conversationId }: { phone?: string, conversationId?: string }) {
  const { data: orders, error, isLoading } = useSWR(phone ? `/api/support/orders?q=${encodeURIComponent(phone)}` : null, fetcher);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleSendOrderToChat = async (order: any) => {
    if (!conversationId) return;
    setSendingId(order.id);
    try {
      const orderMessage = `📦 *Xogta Dalabka (Order Details)*\n\n` +
        `• *Alaabta:* ${order.product?.title || order.catalogue_name || 'Game Topup'}\n` +
        `• *Player Name:* ${order.player_name || 'N/A'}\n` +
        `• *Player ID:* ${order.player_id || 'N/A'}\n` +
        `• *Lacagta:* $${order.amount_paid}\n` +
        `• *Payment:* ${order.gateway_name || order.gateway_id || 'EVC/Waafi'}\n` +
        `• *Status:* ${order.delivery_status} (${order.payment_status})\n` +
        `• *Waqtiga:* ${new Date(order.created_at).toLocaleString()}`;

      await fetch(`/api/support/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: orderMessage,
          idempotencyKey: `ord_${order.id}_${Date.now()}`
        })
      });

      alert("Xogta dalabka waxaa lagu diray chat-ka!");
    } catch (e) {
      alert("Failed to send order into chat.");
    } finally {
      setSendingId(null);
    }
  };

  if (isLoading) return <div className="text-center p-4 text-slate-500 text-sm">Loading orders...</div>;
  if (error) return <div className="text-center p-4 text-red-500 text-sm">Failed to load orders.</div>;
  if (!orders || orders.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center px-4 mt-10">
      <Package size={32} className="mb-3 opacity-50" />
      <p className="text-sm">No orders found for this customer.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {orders.map((o: any) => {
        const prodName = o.product?.title || o.catalogue_name || `${(o.game_code || '').toUpperCase()} Topup`;
        return (
          <div key={o.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 hover:border-slate-300 transition-all shadow-sm">
            <div className="flex justify-between items-start font-bold">
              <span className="text-slate-900 text-sm truncate pr-2">{prodName}</span>
              <span className="text-[#2b3890] font-extrabold text-sm whitespace-nowrap">${o.amount_paid}</span>
            </div>
            
            <div className="bg-white p-2 rounded-lg border border-slate-100 space-y-1">
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-400">Player Name:</span>
                <span className="font-semibold">{o.player_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-slate-700 font-mono">
                <span className="text-slate-400 font-sans">Player ID:</span>
                <span className="font-bold text-slate-900">{o.player_id || 'N/A'} {o.server_id ? `(${o.server_id})` : ''}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-medium text-slate-800">{o.gateway_name || o.gateway_id || 'EVC Plus'}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px] pt-0.5">
                <span>{new Date(o.created_at).toLocaleDateString()}</span>
                <span>{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-1.5">
                <StatusBadge status={o.delivery_status} size="sm" />
                <StatusBadge status={o.payment_status} size="sm" />
              </div>

              {conversationId && (
                <button
                  onClick={() => handleSendOrderToChat(o)}
                  disabled={sendingId === o.id}
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#2b3890] hover:bg-[#20296b] rounded-md transition-colors disabled:opacity-50"
                >
                  {sendingId === o.id ? "Sending..." : "Dir Chat-ka"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CustomerPayments({ phone }: { phone?: string }) {
  const { data: payments, error, isLoading } = useSWR(phone ? `/api/support/payments?q=${encodeURIComponent(phone)}` : null, fetcher);

  if (isLoading) return <div className="text-center p-4 text-slate-500 text-sm">Loading payments...</div>;
  if (error) return <div className="text-center p-4 text-red-500 text-sm">Failed to load payments.</div>;
  if (!payments || payments.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center px-4 mt-10">
      <CreditCard size={32} className="mb-3 opacity-50" />
      <p className="text-sm">No payments found for this customer.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {payments.map((p: any) => (
        <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="flex justify-between items-center font-medium">
            <span className="font-mono text-slate-700 truncate pr-2">{p.reference}</span>
            <span className="text-[#2b3890] whitespace-nowrap">${p.amount}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>{p.method}</span>
            <span>{new Date(p.created_at).toLocaleDateString()}</span>
          </div>
          <div className="pt-1">
            <StatusBadge status={p.status} size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
