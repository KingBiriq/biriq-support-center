"use client";

import useSWR from "swr";
import { Radio, Plus, Phone, Globe } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AddChannelWizard } from "@/components/support/channels/AddChannelWizard";
import { ConfigureChannelModal } from "@/components/support/channels/ConfigureChannelModal";
import { useState } from "react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') { if (typeof window !== 'undefined') window.location.href = '/login?clear=true'; return; }
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function ChannelsPage() {
  const { data: channels, error, isLoading, mutate } = useSWR('/api/support/channels', fetcher);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [activeConfigureChannel, setActiveConfigureChannel] = useState<any>(null);

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Channels</h1>
          <p className="text-slate-500 mt-1">Manage connected communication channels.</p>
        </div>
        <button 
          onClick={() => setShowAddWizard(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Channel
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-40 rounded-xl" />
      ) : error ? (
        <ErrorState title="Failed to load channels" message={error.message} onRetry={() => mutate()} />
      ) : !channels || channels.length === 0 ? (
        <EmptyState 
          icon={Radio}
          title="No channels configured"
          description="Connect WhatsApp or Website Chat to start receiving messages."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((ch: any) => (
            <div key={ch.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-start justify-between mb-6">
                <div className={`p-3 rounded-xl ${ch.channel_type === 'whatsapp' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                  {ch.channel_type === 'whatsapp' ? <Phone className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
                </div>
                <StatusBadge status={ch.status} />
              </div>
              
              <h3 className="font-bold text-lg text-slate-900 mb-1 capitalize">
                {ch.channel_type === 'whatsapp' ? 'WhatsApp Business' : 'Website Widget'}
              </h3>
              <p className="text-slate-500 text-sm font-mono mb-4">{ch.identifier || 'Unknown'}</p>
              
              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">ID: {ch.id?.slice(0,8)}...</span>
                <button 
                  onClick={() => setActiveConfigureChannel(ch)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddWizard && (
        <AddChannelWizard
          onClose={() => setShowAddWizard(false)}
          onSuccess={() => {
            setShowAddWizard(false);
            mutate();
          }}
        />
      )}

      {activeConfigureChannel && (
        <ConfigureChannelModal
          channel={activeConfigureChannel}
          onClose={() => setActiveConfigureChannel(null)}
        />
      )}
    </div>
  );
}
