"use client";

import useSWR from "swr";
import { Bell, Check, Trash2, Mail } from "lucide-react";
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

export default function NotificationsPage() {
  const { data: notifications, error, isLoading, mutate } = useSWR('/api/support/notifications', fetcher);

  const handleMarkRead = async (id: string, is_read: boolean) => {
    try {
      await fetch('/api/support/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_read })
      });
      mutate();
    } catch (e) {
      alert("Failed to update notification");
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">Updates on assignments and internal mentions.</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-20 w-full rounded-xl" lines={5} />
      ) : error ? (
        <ErrorState title="Failed to load notifications" message={error.message} onRetry={() => mutate()} />
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState 
          icon={Bell}
          title="No notifications yet"
          description="You're all caught up! We'll notify you when there's an update."
        />
      ) : (
        <div className="space-y-4">
          {notifications.map((n: any) => (
            <div key={n.id} className={`bg-white border rounded-xl p-4 sm:p-6 shadow-sm flex items-start gap-4 transition-colors ${n.is_read ? 'border-slate-200 opacity-70' : 'border-blue-200 bg-blue-50/30'}`}>
              <div className={`p-2 rounded-lg shrink-0 ${n.is_read ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                {n.type === 'mention' ? <Mail className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex sm:items-center flex-col sm:flex-row justify-between gap-2 mb-1">
                  <h3 className={`font-bold truncate ${n.is_read ? 'text-slate-700' : 'text-slate-900'}`}>{n.title}</h3>
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-600 text-sm mb-3 line-clamp-2">{n.message}</p>
                <div className="flex items-center gap-3">
                  {n.action_url && (
                    <Link href={n.action_url} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      View details
                    </Link>
                  )}
                  <button 
                    onClick={() => handleMarkRead(n.id, !n.is_read)}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" /> {n.is_read ? 'Mark as unread' : 'Mark as read'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
