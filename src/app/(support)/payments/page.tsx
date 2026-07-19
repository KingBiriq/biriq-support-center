"use client";

import useSWR from "swr";
import { useState } from "react";
import { CreditCard, Search, Filter, ExternalLink } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const { data: payments, error, isLoading, mutate } = useSWR(`/api/support/payments${search ? `?q=${search}` : ''}`, fetcher);

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search phone, name, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 font-medium">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-20 w-full rounded-xl" />
          <LoadingSkeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState title="Failed to load payments" message={error.message} onRetry={() => mutate()} />
      ) : !payments || payments.length === 0 ? (
        <EmptyState 
          icon={CreditCard}
          title="No payments found"
          description={search ? "No payments match your search." : "Payments from the store will appear here."}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-500">
                <th className="p-4">Customer</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Method</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{p.customer_name}</p>
                    <p className="text-sm text-slate-500 font-mono">{p.phone}</p>
                  </td>
                  <td className="p-4 font-mono text-sm text-slate-700">{p.reference}</td>
                  <td className="p-4 font-medium">${p.amount}</td>
                  <td className="p-4 text-slate-700">{p.method}</td>
                  <td className="p-4">
                    <StatusBadge status={p.status?.toLowerCase()} />
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/?payment=${p.id}`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Link to Conversation">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
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
