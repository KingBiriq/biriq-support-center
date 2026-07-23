"use client";

import { useState } from "react";
import useSWR from "swr";
import { 
  Send, RefreshCw, Users, AlertCircle, Play, 
  CheckCircle2, LayoutTemplate, HelpCircle, Upload, MessageSquare, Image as ImageIcon, Video, X 
} from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') { if (typeof window !== 'undefined') window.location.href = '/login?clear=true'; return; }
  if (!json.success) throw new Error(json.error?.message || "Failed to load");
  return json.data;
};

export default function CampaignsPage() {
  const { data: templates, error: tErr, isLoading: tLoading } = useSWR('/api/support/templates', fetcher);
  const { data: contacts, error: cErr, isLoading: cLoading } = useSWR('/api/support/contacts', fetcher);

  const [campaignType, setCampaignType] = useState<'text' | 'template'>('text');
  const [customText, setCustomText] = useState("");
  const [mediaAttachment, setMediaAttachment] = useState<{ name: string; type: string; base64: string; previewUrl: string } | null>(null);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [manualNumbers, setManualNumbers] = useState("");
  const [includeSavedContacts, setIncludeSavedContacts] = useState(false);
  const [includeWebsiteGuests, setIncludeWebsiteGuests] = useState(false);
  
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; queuedCount?: number; recipientsCount?: number; error?: string } | null>(null);

  // Find currently selected template details
  const selectedTemplate = templates?.find((t: any) => t.id === selectedTemplateId);

  // Calculate the total number of valid manually entered numbers
  const manualNumbersCount = manualNumbers 
    ? Array.from(new Set(manualNumbers.split('\n').map(n => n.trim()).filter(n => n.length > 5))).length 
    : 0;

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const resultStr = event.target?.result as string;
      const base64 = resultStr.split(',')[1];
      setMediaAttachment({
        name: file.name,
        type: file.type,
        base64,
        previewUrl
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const matches = text.match(/\+?[0-9]{7,15}/g) || [];
      if (matches.length === 0) {
        alert("Wax nambaro ah lagama helin faylkan. Fadlan hubi inuu faylku yahay CSV, VCF ama TXT.");
        return;
      }

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
    if (campaignType === 'template' && !selectedTemplateId) {
      alert("Fadlan dooro WhatsApp Template ku habboon!");
      return;
    }

    if (campaignType === 'text' && !customText.trim() && !mediaAttachment) {
      alert("Fadlan qroal ama sawir/video u dooro farriintaada!");
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
          campaignType,
          templateName: selectedTemplate?.meta_template_name,
          templateLanguage: selectedTemplate?.language,
          messageBody: customText,
          attachment: mediaAttachment ? {
            name: mediaAttachment.name,
            type: mediaAttachment.type,
            base64: mediaAttachment.base64
          } : undefined,
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
      setCustomText("");
      setMediaAttachment(null);
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
          <p className="text-slate-500 mt-1">U dir Qoraal, Sawir/Video ama Template macaamiil aad u badan hal mar.</p>
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
              
              {/* Step 1: Campaign Type Selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  1. Dooro Nooca Farriinta (Message Mode)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setCampaignType('text')}
                    className={`p-4 rounded-xl border flex items-center gap-3 text-left transition-all ${
                      campaignType === 'text'
                        ? 'border-[#2b3890] bg-[#2b3890]/5 text-[#2b3890] font-bold shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-sm">Farriin Caadi ah (Text & Media)</p>
                      <p className="text-xs text-slate-500 font-normal">Qoraal xor ah, Sawir ama Video</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCampaignType('template')}
                    className={`p-4 rounded-xl border flex items-center gap-3 text-left transition-all ${
                      campaignType === 'template'
                        ? 'border-[#2b3890] bg-[#2b3890]/5 text-[#2b3890] font-bold shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <LayoutTemplate className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-sm">WhatsApp Template</p>
                      <p className="text-xs text-slate-500 font-normal">Template-yada hore u ansaxay</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2: Content Details */}
              {campaignType === 'template' ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Doorro WhatsApp Template
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
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Qroalka Farriinta Ololaha (Message Content)
                    </label>
                    <textarea
                      rows={4}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="Qor farriinta aad rabto inaad u wada dirtid macaamiisha..."
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:border-[#2b3890] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      Ku dar Sawir ama Video (Optional Attachment)
                    </label>
                    {mediaAttachment ? (
                      <div className="relative w-full h-36 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                        {mediaAttachment.type.startsWith('video/') ? (
                          <video src={mediaAttachment.previewUrl} controls className="h-full object-contain" />
                        ) : (
                          <img src={mediaAttachment.previewUrl} alt="Preview" className="h-full object-contain" />
                        )}
                        <button
                          type="button"
                          onClick={() => setMediaAttachment(null)}
                          className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-md"
                          title="Ka bixi"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 hover:border-[#2b3890] bg-slate-50 hover:bg-slate-100/50 rounded-lg cursor-pointer transition-colors text-slate-600 text-xs font-semibold">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>Doorho Sawir ama Video faylkaaga ka soo dooro (Upload Media)</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={handleMediaUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Select Recipients Sources */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  3. Dooro Halkee laga helayaa Nambarada (Sources)
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
                      <span className="font-semibold text-slate-900 block text-sm">Macaamiisha Website-ka ka soo hadlay</span>
                      <span className="text-xs text-slate-500">
                        Soo saar nambarada WhatsApp-ka macaamiisha Web widget-ka.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 4: Manual Numbers or File Upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-900 flex items-center gap-2">
                    4. Geli ama Ku dar Nambaro Dheeraad ah (Manual Entry / File)
                    {manualNumbersCount > 0 && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {manualNumbersCount.toLocaleString()} Nambar
                      </span>
                    )}
                  </label>
                  <label className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV / TXT File</span>
                    <input 
                      type="file" 
                      accept=".csv, .txt, .vcf" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
                
                <textarea
                  rows={3}
                  value={manualNumbers}
                  onChange={(e) => setManualNumbers(e.target.value)}
                  placeholder="Geli nambarada (mid kasta saf ha kaga jiro, e.g. 252616417528 ama 0616417528)..."
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:border-[#2b3890] resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-[#2b3890] hover:bg-[#20296b] text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Fariimaha waa la dirayaa...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Bilow Ololaha (Start Bulk Campaign)</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Preview / Instructions Side */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                Hadafka Ololaha Farriimaha
              </h3>
              
              <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
                <li>Farriimaha dhan waxay toos uga dhacayaan WhatsApp-ka macaamiisha.</li>
                <li>Waxaad diri kartaa Farriin caadi ah, Sawir ama Video aad ka soo doorato faylkaaga.</li>
                <li>Nambarada waxaa loo soo saaraa si automatic ah iyadoo la kala saarayo (deduplicated).</li>
              </ul>
            </div>

            {/* Campaign Result Card */}
            {result && (
              <div className={`p-6 rounded-xl border shadow-sm transition-all ${
                result.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}>
                {result.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-800 text-base">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Ololihii waa la bilaabay si guul leh!</span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Waxaa la helay <span className="font-bold">{result.recipientsCount}</span> macaamiil ah. <span className="font-bold">{result.queuedCount}</span> fariimood ayaa safka lagu daray (Outbound Queue).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-bold text-red-800 text-base">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span>Ololihii waa meelmari waayay</span>
                    </div>
                    <p className="text-xs text-red-700">{result.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
