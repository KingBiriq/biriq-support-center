"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function SettingsPage() {
  const { data: settingsData, error, isLoading, mutate } = useSWR('/api/support/settings', fetcher);
  
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsData && Array.isArray(settingsData)) {
      const initial: any = {};
      settingsData.forEach((s: any) => {
        initial[s.key] = s.value;
      });
      setFormData(initial);
    }
  }, [settingsData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/support/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error(await res.text());
      alert("Settings saved successfully.");
      mutate();
    } catch (e: any) {
      alert("Failed to save settings: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Configure workspace preferences.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-64 rounded-xl" />
      ) : error ? (
        <ErrorState title="Failed to load settings" message={error.message} onRetry={() => mutate()} />
      ) : (
        <div className="max-w-3xl space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-400" /> General Setup
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input 
                  type="text" 
                  value={formData.company_name || ''}
                  onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                  <select 
                    value={formData.timezone || 'Africa/Mogadishu'}
                    onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Africa/Mogadishu">Africa/Mogadishu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Language</label>
                  <select 
                    value={formData.default_language || 'so'}
                    onChange={e => setFormData({ ...formData, default_language: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="so">Somali</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SLA First Response (mins)</label>
                  <input 
                    type="number" 
                    value={formData.sla_first_response_minutes || ''}
                    onChange={e => setFormData({ ...formData, sla_first_response_minutes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SLA Resolution (mins)</label>
                  <input 
                    type="number" 
                    value={formData.sla_resolution_minutes || ''}
                    onChange={e => setFormData({ ...formData, sla_resolution_minutes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
