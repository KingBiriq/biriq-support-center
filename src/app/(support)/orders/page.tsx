"use client";

import useSWR from "swr";
import { useState } from "react";
import { ShoppingCart, Search, Filter, ExternalLink } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') { if (typeof window !== 'undefined') window.location.href = '/login?clear=true'; return; }
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json;
};

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;
  
  const query = new URLSearchParams();
  if (search) query.set("q", search);
  query.set("page", page.toString());
  query.set("limit", limit.toString());

  const { data: response, error, isLoading, mutate } = useSWR(`/api/support/orders?${query.toString()}`, fetcher);
  const orders = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search phone, name, or game code..."
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
        <ErrorState title="Failed to load orders" message={error.message} onRetry={() => mutate()} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState 
          icon={ShoppingCart}
          title="No orders found"
          description={search ? "No orders match your search." : "Orders from the store will appear here."}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-500">
                <th className="p-4">Customer</th>
                <th className="p-4">Product & Player Details</th>
                <th className="p-4">Amount & Gateway</th>
                <th className="p-4">Delivery</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o: any) => {
                const productTitle = o.catalogue_name || o.product?.title || (o.game_code ? `${o.game_code.toUpperCase()} Package` : 'Gaming Package');
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">{o.customer_name || o.player_name || 'Macaamiil Biriq'}</p>
                      <p className="text-xs text-slate-500 font-mono">{o.customer_phone}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-blue-900 text-sm">{productTitle}</p>
                      <p className="text-xs text-slate-600 font-medium">
                        Player: <span className="text-slate-900 font-semibold">{o.player_name || '-'}</span> | ID: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">{o.player_id || '-'}</span>
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">${o.amount_paid}</p>
                      <p className="text-xs text-slate-500 font-medium">{o.gateway_name || o.gateway_id || 'Online'}</p>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={o.delivery_status?.toLowerCase()} />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={o.payment_status?.toLowerCase()} />
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/?order=${o.id}`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Go to Chat">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-900">{((page - 1) * limit) + 1}</span> to <span className="font-medium text-slate-900">{Math.min(page * limit, totalCount)}</span> of <span className="font-medium text-slate-900">{totalCount}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-slate-700 px-2">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
