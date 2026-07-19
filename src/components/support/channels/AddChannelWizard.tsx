"use client";

import { useState } from "react";
import { X, Phone, Globe, MessageCircle, Mail, AlertCircle, Video } from "lucide-react";

interface AddChannelWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddChannelWizard({ onClose, onSuccess }: AddChannelWizardProps) {
  const [step, setStep] = useState(1);
  const [channelType, setChannelType] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channels = [
    { id: 'whatsapp', name: 'WhatsApp Business', icon: Phone, color: 'text-green-600', bg: 'bg-green-100', desc: 'Connect official WhatsApp Cloud API' },
    { id: 'web', name: 'Website Chat', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-100', desc: 'Live chat widget for your store' },
    { id: 'telegram', name: 'Telegram Bot', icon: MessageCircle, color: 'text-sky-500', bg: 'bg-sky-100', desc: 'Connect a Telegram bot' },
    { id: 'gmail', name: 'Gmail Inbox', icon: Mail, color: 'text-red-500', bg: 'bg-red-100', desc: 'Sync customer support emails' },
    { id: 'tiktok', name: 'TikTok Shop', icon: Video, color: 'text-black', bg: 'bg-slate-200', desc: 'Official TikTok Shop API Integration' },
  ];

  const handleCreate = async () => {
    if (!channelType || !displayName) {
      setError("Please select a channel type and provide a name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/support/channels/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_type: channelType, display_name: displayName })
      });
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to create channel');
      
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">
            {step === 1 ? 'Select Channel Type' : 'Configure Channel'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channels.map(c => {
                const Icon = c.icon;
                const isSelected = channelType === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setChannelType(c.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${c.bg} ${c.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-slate-900">{c.name}</span>
                    </div>
                    <p className="text-sm text-slate-500">{c.desc}</p>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && channelType === 'tiktok' && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                  <Video className="w-6 h-6 text-black" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Official API Access Required</h3>
                <p className="text-slate-600 mb-6 max-w-md">
                  To connect Biriq Support to your TikTok Shop, your business must first be approved by TikTok for their official Partner API program.
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 px-4 py-2 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  Currently in waitlist.
                </div>
              </div>
            </div>
          )}

          {step === 2 && channelType !== 'tiktok' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Internal Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Main WhatsApp Support"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                <p className="mt-2 text-sm text-slate-500">A name to identify this channel in your dashboard.</p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="font-medium text-slate-900 text-sm mb-2">Next Steps</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  After creating the channel, you will need to provide your API credentials and setup webhooks to complete the connection.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button 
            className="px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg font-medium transition-colors"
            onClick={step === 2 ? () => setStep(1) : onClose}
          >
            {step === 2 ? 'Back' : 'Cancel'}
          </button>
          
          {step === 1 ? (
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setStep(2)} 
              disabled={!channelType}
            >
              Continue
            </button>
          ) : channelType === 'tiktok' ? (
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors font-medium opacity-50 cursor-not-allowed"
              disabled
            >
              Join Waitlist
            </button>
          ) : (
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreate} 
              disabled={!displayName || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Channel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
