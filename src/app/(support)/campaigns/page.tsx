"use client";

import { useState } from "react";
import useSWR from "swr";
import { 
  Send, RefreshCw, Users, AlertCircle, Play, 
  CheckCircle2, LayoutTemplate, HelpCircle, Upload 
} from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function CampaignsPage() {
  const { data: templates, error: tErr, isLoading: tLoading } = useSWR('/api/support/templates', fetcher);
  const { data: contacts, error: cErr, isLoading: cLoading } = useSWR('/api/support/contacts', fetcher);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [manualNumbers, setManualNumbers] = useState("");
  const [includeSavedContacts, setIncludeSavedContacts] = useState(false);
  const [includeWebsiteGuests, setIncludeWebsiteGuests] = useState(false);
  
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; queuedCount?: number; recipientsCount?: number; error?: string } | null>(null);

  // Find currently selected template details
  const selectedTemplate = templates?.find((t: any) => t.id === selectedTemplateId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Extract anything that looks like a phone number (e.g. 7 to 15 digits)
      const matches = text.match(/\+?[0-9]{7,15}/g) || [];
      if (matches.length === 0) {
        alert("Wax nambaro ah lagama helin faylkan. Fadlan hubi inuu faylku yahay CSV, VCF ama TXT.");
        return;
      }

      // Format and deduplicate
      const uniqueNumbers = Array.from(new Set(matches.map(num => num.trim())));
      const currentList = manualNumbers ? manualNumbers + "\n" : "";
      setManualNumbers(currentList + uniqueNumbers.join("\n"));
      alert(`Si guul leh ayaa loo soo saaray ${uniqueNumbers.length} nambaro ah faylka!`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleStartCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      alert("Fadlan dooro WhatsApp Template ku habboon!");
      return;
    }

    if (!includeSavedContacts && !includeWebsiteGuests && !manualNumbers.trim()) {
      alert("Fadlan dooro ugu yaraan hal il (source) oo nambaro laga helayo!");
      return;
    }

    if (!confirm("Ma hubtaa inaad rabto inaad bilowdo ololahan fariimaha badan ee WhatsApp-ka?")) {
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/support/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: selectedTemplate.meta_template_name,
          templateLanguage: selectedTemplate.language,
          manualNumbers,
          includeSavedContacts,
          includeWebsiteGuests
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to start campaign");

      setResult({
        success: true,
        queuedCount: json.queuedCount,
        recipientsCount: json.recipientsCount
      });
      // Clear form on success
      setManualNumbers("");
      setIncludeSavedContacts(false);
      setIncludeWebsiteGuests(false);
      setSelectedTemplateId("");
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || "Error running campaign"
      });
    } finally {
      setIsSending(false);
    }
  };

  const isLoading = tLoading || cLoading;
  const error = tErr || cErr;

  return (
    <div className="flex-1 p-8 bg-slate-50 h-full flex flex-col overflow-y-auto">
      {/* Title */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bulk Send (Farriimaha Badan)</h1>
          <p className="text-slate-500 mt-1">U dir WhatsApp Template macaamiil aad u badan hal mar.</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-64 rounded-xl" />
      ) : error ? (
        <ErrorState title="Qalad ayaa dhacay inta xogta la soo rarayay" message={error.message} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Side */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleStartCampaign} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              
              {/* Step 1: Select Template */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  1. Doorro WhatsApp Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-white text-slate-950 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>-- Doorro Template --</option>
                  {templates?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.meta_template_name} ({t.language})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Recipients Sources */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  2. Dooro Halkee laga helayaa Nambarada (Sources)
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Saved Contacts */}
                  <label className="flex items-start p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeSavedContacts}
                      onChange={(e) => setIncludeSavedContacts(e.target.checked)}
                      className="mt-1 mr-3 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-350"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block text-sm">Dhamaan Macaamiisha La Keydiyay</span>
                      <span className="text-xs text-slate-500">
                        {contacts?.length || 0} macaamiil oo database-ka ku jira.
                      </span>
                    </div>
                  </label>

                  {/* Website Guests */}
                  <label className="flex items-start p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeWebsiteGuests}
                      onChange={(e) => setIncludeWebsiteGuests(e.target.checked)}
                      className="mt-1 mr-3 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-350"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block text-sm">Website Guest Customers</span>
                      <span className="text-xs text-slate-500">
                        Macaamiishii website-ka ee soo reebay nambaradooda WhatsApp.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 3: Manual Input Textarea */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    3. Nambaro Gacanta lagu shubayo (Manual Input) - Ikhtiyaari
                  </label>
                  <label className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV / VCF / TXT</span>
                    <input
                      type="file"
                      accept=".csv,.vcf,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  value={manualNumbers}
                  onChange={(e) => setManualNumbers(e.target.value)}
                  placeholder="Ku shub nambarada halkan. Ku kala saar xariiqyo cusub (newlines) ama koomayaal (e.g. 252616010749, +25261...)"
                  rows={5}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-950 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-semibold shadow disabled:opacity-50 transition-colors"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Oloolaha waa la bilaabayaa...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Bilow Ololaha (Send Bulk Campaign)</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Details / Preview Side */}
          <div className="space-y-6">
            
            {/* Live Status Result */}
            {result && (
              <div className={`border p-6 rounded-xl shadow-sm ${result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'}`}>
                <div className="flex items-center gap-3 mb-2">
                  {result.success ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <AlertCircle className="w-6 h-6 text-rose-600" />}
                  <h3 className="font-bold text-lg">
                    {result.success ? "Ololaha Waa Lagu Guulaystay!" : "Qalad ayaa Dhacay"}
                  </h3>
                </div>
                {result.success ? (
                  <p className="text-sm">
                    Fariimaha template-ka waxaa si guul leh loogu habeeyay oo safka (queue) loogu daray <strong>{result.queuedCount}</strong> macaamiil ah (nambarada guud ee la aqbalay: {result.recipientsCount}). Nidaamka wuxuu bilaabay inuu mid-mid ugu diro WhatsApp-kooda hadda!
                  </p>
                ) : (
                  <p className="text-sm">
                    Sababta qaladka: {result.error}
                  </p>
                )}
              </div>
            )}

            {/* Template Body Preview */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-blue-600" />
                Template Preview
              </h3>
              
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Magaca Template-ka</span>
                    <span className="font-bold text-slate-800 text-sm">{selectedTemplate.meta_template_name}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Luuqada</span>
                    <span className="font-semibold text-slate-700 text-sm uppercase">{selectedTemplate.language}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Farriinta dhabta ah</span>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap font-mono">
                      {selectedTemplate.body || "No body content"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <HelpCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Fadlan dooro template si aad u aragto farriinta uu ka kooban yahay halkan.</p>
                </div>
              )}
            </div>

            {/* General Advice */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-blue-950">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                Ogeysiis Muhiim Ah
              </h4>
              <ul className="text-xs space-y-2 list-disc list-inside opacity-90">
                <li>Hubi in template-ka aad dooranayso uu yahay mid Meta Business ay horay u soo ansixisay.</li>
                <li>Nambarada waxaa si toos ah loogu dari doonaa ololaha dirista background-ka ee Vercel.</li>
                <li>Nidaamka wuxuu dirayaa fariimo is daba joog ah si aan WhatsApp account-kaagu spam u noqon.</li>
              </ul>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
