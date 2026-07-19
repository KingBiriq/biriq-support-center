"use client";

import useSWR from "swr";
import { useState } from "react";
import { ClipboardList, Search, Filter } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState("");
  const { data: logs, error, isLoading } = useSWR(`/api/support/audit-logs${actionFilter ? `?action=${actionFilter}` : ''}`, fetcher);

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 mt-1">Read-only history of system changes and actions.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by action type (e.g. settings.updated)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 font-medium">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-64 rounded-xl" />
      ) : error ? (
        <ErrorState title="Failed to load audit logs" message={error.message} />
      ) : !logs || logs.length === 0 ? (
        <EmptyState 
          icon={ClipboardList}
          title="No logs found"
          description={actionFilter ? "No audit logs match your filter." : "Audit history is empty."}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-500">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Staff</th>
                <th className="p-4">Action</th>
                <th className="p-4">Details</th>
                <th className="p-4">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{log.staff?.first_name || 'System'}</p>
                  </td>
                  <td className="p-4">
                    <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 font-mono text-xs rounded-lg border border-blue-100">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600 font-mono">
                    <div className="max-w-md truncate" title={JSON.stringify(log.details)}>
                      {JSON.stringify(log.details)}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500 font-mono">
                    {log.ip_address || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
