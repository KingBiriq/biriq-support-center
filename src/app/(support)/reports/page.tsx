"use client";

import useSWR from "swr";
import { BarChart3, TrendingUp, Clock, Calendar, Download } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function ReportsPage() {
  const { data: report, error, isLoading } = useSWR('/api/support/reports', fetcher);

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Support performance and volume metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            disabled 
            title="Date filtering will be available after analytics engine integration."
            className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-400 rounded-lg flex items-center gap-2 font-medium shadow-sm cursor-not-allowed"
          >
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </button>
          <button 
            disabled
            title="CSV Export will be available after analytics engine integration."
            className="px-4 py-2 bg-blue-400 text-white rounded-lg flex items-center gap-2 font-medium shadow-sm cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-64 rounded-xl" />
      ) : error ? (
        <ErrorState title="Failed to load reports" message={error.message} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-slate-700">Total Volume</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{report?.total_conversations || 0}</p>
              <p className="text-sm text-slate-500 mt-2">All time conversations</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-slate-700">Resolved</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{report?.volume_by_status?.resolved || 0}</p>
              <p className="text-sm text-slate-500 mt-2">Total resolved cases</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Staff Performance</h3>
              <p className="text-slate-500 mt-1 text-sm">Conversation handling metrics by agent.</p>
            </div>
            {report?.staff_performance?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Agent Name</th>
                      <th className="px-6 py-4">Assigned</th>
                      <th className="px-6 py-4">Resolved</th>
                      <th className="px-6 py-4">Closed</th>
                      <th className="px-6 py-4">Resolution Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.staff_performance.map((staff: any, idx: number) => {
                      const rate = staff.assigned > 0 ? Math.round((staff.resolved / staff.assigned) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{staff.name}</td>
                          <td className="px-6 py-4 text-slate-600">{staff.assigned}</td>
                          <td className="px-6 py-4 text-emerald-600 font-medium">{staff.resolved}</td>
                          <td className="px-6 py-4 text-slate-600">{staff.closed}</td>
                          <td className="px-6 py-4 text-slate-600">
                            <div className="flex items-center gap-2">
                              <span>{rate}%</span>
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rate}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                 <Clock className="w-10 h-10 text-slate-300 mb-3" />
                 <h4 className="text-slate-700 font-medium">No performance data</h4>
                 <p className="text-slate-500 text-sm mt-1">No assigned conversations found.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
