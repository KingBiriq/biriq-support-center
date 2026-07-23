"use client";

import useSWR from "swr";
import { useState } from "react";
import { Users, Search, Filter, Trash2, MessageSquare, Phone, Mail } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') { if (typeof window !== 'undefined') window.location.href = '/login?clear=true'; return; }
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const { data: contacts, error, isLoading, mutate } = useSWR(`/api/support/contacts${search ? `?q=${search}` : ''}`, fetcher);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await fetch(`/api/support/contacts?id=${id}`, { method: 'DELETE' });
      if (res.ok) mutate();
      else alert("Failed to delete contact");
    } catch (e) {
      alert("Error deleting contact");
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts..."
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
        <ErrorState title="Failed to load contacts" message={error.message} onRetry={() => mutate()} />
      ) : !contacts || contacts.length === 0 ? (
        <EmptyState 
          icon={Users}
          title="No contacts found"
          description={search ? "No contacts match your search." : "When you interact with customers, they will appear here."}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-500">
                <th className="p-4">Name</th>
                <th className="p-4">Channels</th>
                <th className="p-4">Added</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {(c.first_name?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{c.first_name} {c.last_name}</p>
                        <p className="text-sm text-slate-500">{c.customer_id ? `ID: ${c.customer_id}` : 'No Store ID'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {c.primary_phone && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          WhatsApp: {c.primary_phone}
                        </span>
                      )}
                      {c.primary_email && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                          <Mail className="w-3 h-3 text-purple-600" />
                          Web: {c.primary_email}
                        </span>
                      )}
                      {(!c.primary_phone && !c.primary_email) && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          Website Support
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500 font-medium">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/?contact=${c.id}`} className="p-2 text-[#2b3890] hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 flex items-center gap-1 text-xs font-semibold" title="Direct Chat">
                        <MessageSquare className="w-4 h-4" />
                        <span>Chat</span>
                      </Link>
                      <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
