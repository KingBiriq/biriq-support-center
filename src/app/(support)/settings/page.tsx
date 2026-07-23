"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') { if (typeof window !== 'undefined') window.location.href = '/login?clear=true'; return; }
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
          <p className="text-slate-500 mt-1">Configure workspace preferences and admin credentials.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || isLoading}
          className="px-4 py-2 bg-[#2b3890] hover:bg-[#20296b] text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-64 rounded-xl" />
      ) : error ? (
        <ErrorState title="Failed to load settings" message={error.message} />
      ) : (
        <div className="space-y-6 max-w-3xl">
          {/* Admin Credentials Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Admin Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email</label>
                <input
                  type="email"
                  value={formData.admin_email || ""}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  placeholder="admin@biriqstore.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#2b3890]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (leave blank to keep)</label>
                <input
                  type="password"
                  value={formData.admin_password || ""}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#2b3890]"
                />
              </div>
            </div>
          </div>

          {/* Security & Staff Approval Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Security & Device Approvals</h3>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="font-semibold text-sm text-slate-800">Oggolaanshaha Moobilada Stafka (Require Admin Approval)</p>
                <p className="text-xs text-slate-500">Marka shaqaale uu ka soo galo moobil ama device cusub, ma geli karo ilaa adigu aad ka oggolaato.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.require_staff_device_approval === "true"}
                onChange={(e) => setFormData({ ...formData, require_staff_device_approval: e.target.checked ? "true" : "false" })}
                className="w-5 h-5 accent-[#2b3890] cursor-pointer"
              />
            </div>
          </div>

          {/* General Workspace Settings */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">General Preferences</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Support Email</label>
                <input
                  type="text"
                  value={formData.support_email || ""}
                  onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#2b3890]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Auto-close inactive conversations (Hours)</label>
                <input
                  type="number"
                  value={formData.auto_close_hours || "24"}
                  onChange={(e) => setFormData({ ...formData, auto_close_hours: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#2b3890]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
