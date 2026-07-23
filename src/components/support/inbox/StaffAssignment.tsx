"use client";
import { useState } from "react";
import useSWR from "swr";
import { UserRound, Check } from "lucide-react";
import { mutate } from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') { if (typeof window !== 'undefined') window.location.href = '/login?clear=true'; return; }
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function StaffAssignment({ conversation }: { conversation: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: staff } = useSWR('/api/support/staff', fetcher);

  const assignStaff = async (agentId: string) => {
    try {
      await fetch(`/api/support/conversations/${conversation.id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', payload: { agent_id: agentId } })
      });
      mutate((key: any) => typeof key === 'string' && key.startsWith('/api/support/inbox'));
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="hidden sm:flex items-center bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-600 mr-2 cursor-pointer hover:bg-slate-200 transition-colors"
      >
        <UserRound size={14} className="mr-1.5" />
        {conversation.assignee?.first_name || "Unassigned"}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-lg z-50 p-2">
          <div className="text-xs font-semibold text-slate-500 mb-2 px-2">Assign to</div>
          <div className="max-h-60 overflow-y-auto flex flex-col gap-1">
            <button 
              onClick={() => assignStaff("me")}
              className={`text-left px-2 py-1.5 rounded-md hover:bg-slate-50 text-sm flex items-center justify-between ${!conversation.assignee ? "font-semibold bg-blue-50 text-blue-700" : "text-slate-700"}`}
            >
              <span>Assign to Me</span>
            </button>
            <div className="h-px bg-slate-100 my-1"></div>
            {(staff?.staff || []).map((s: any) => (
              <button 
                key={s.id}
                onClick={() => assignStaff(s.id)}
                className={`text-left px-2 py-1.5 rounded-md hover:bg-slate-50 text-sm flex items-center justify-between ${conversation.assignee?.id === s.id ? "font-semibold bg-blue-50 text-blue-700" : "text-slate-700"}`}
              >
                <span>{s.first_name} {s.last_name}</span>
                {conversation.assignee?.id === s.id && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
