"use client";

import useSWR from "swr";
import { LayoutDashboard, MessageSquare, Clock, Users, UserMinus, CheckCircle, Archive, AlertCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR('/api/support/dashboard', fetcher);

  if (isLoading) {
    return (
      <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <LoadingSkeleton className="h-32 rounded-xl" />
          <LoadingSkeleton className="h-32 rounded-xl" />
          <LoadingSkeleton className="h-32 rounded-xl" />
          <LoadingSkeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>
        <ErrorState 
          title="Could not load dashboard" 
          message={error?.message || "Please check your connection and try again."}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const m = data.metrics || {};

  const statCards = [
    { title: "Open", value: m.open || 0, icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Waiting", value: m.waiting || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Unassigned", value: m.unassigned || 0, icon: UserMinus, color: "text-rose-600", bg: "bg-rose-50" },
    { title: "Unread", value: m.unread || 0, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
    { title: "Solved", value: m.resolved || 0, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Snoozed", value: m.snoozed || 0, icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "Closed", value: m.closed || 0, icon: Archive, color: "text-slate-600", bg: "bg-slate-50" },
    { title: "WhatsApp", value: m.channels?.whatsapp || 0, icon: MessageSquare, color: "text-green-600", bg: "bg-green-50" },
    { title: "Website", value: m.channels?.website || 0, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col overflow-y-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-4 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Conversation Volume (Last 7 Days)</h3>
          <div className="h-72 w-full">
            {data.charts?.volume?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.volume}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="whatsapp" name="WhatsApp" stackId="a" fill="#16a34a" radius={[0, 0, 4, 4]} barSize={32} />
                  <Bar dataKey="website" name="Website" stackId="a" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No data available</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Channel Distribution</h3>
          <div className="h-72 w-full flex items-center justify-center">
            {data.charts?.channels?.some((c: any) => c.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.channels}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                  >
                    {data.charts.channels.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
