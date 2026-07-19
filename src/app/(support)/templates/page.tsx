"use client";

import { useState } from "react";
import useSWR from "swr";
import { MessageSquareDashed, RefreshCw } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function TemplatesPage() {
  const { data: templates, error, isLoading, mutate } = useSWR('/api/support/templates', fetcher);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/support/templates/sync', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to sync');
      alert(`Successfully synced ${json.data.synced} templates from Meta`);
      mutate();
    } catch (e: any) {
      alert(e.message || "Error syncing templates");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">WhatsApp Templates</h1>
          <p className="text-slate-500 mt-1">Pre-approved messages for starting conversations.</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 font-medium shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync from Meta'}
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-64 rounded-xl" />
      ) : error ? (
        <ErrorState title="Failed to load templates" message={error.message} />
      ) : !templates || templates.length === 0 ? (
        <EmptyState 
          icon={MessageSquareDashed}
          title="No templates found"
          description="Sync your templates from Meta Business Manager."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((t: any) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900">{t.meta_template_name}</h3>
                  <p className="text-sm text-slate-500 uppercase tracking-wider font-mono mt-1">{t.language}</p>
                </div>
                <StatusBadge status={t.status?.toLowerCase()} />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex-1">
                <p className="text-slate-700 whitespace-pre-wrap">{t.body || "No body content"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
