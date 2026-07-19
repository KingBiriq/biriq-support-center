"use client";

import { X, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface ConfigureChannelModalProps {
  channel: any;
  onClose: () => void;
}

export function ConfigureChannelModal({ channel, onClose }: ConfigureChannelModalProps) {
  const [copied, setCopied] = useState(false);

  // We assume the main store API handles webhooks.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://biriq-store.vercel.app";
  
  let webhookUrl = "";
  let instructions = "";

  if (channel.channel_type === "whatsapp") {
    webhookUrl = `${appUrl}/api/webhooks/whatsapp`;
    instructions = "Paste this Webhook URL into your Meta App Developer Dashboard (WhatsApp > Configuration). Use 'biriq_support_webhook_token_2026' as the Verify Token. Note: If you are testing locally, use your Ngrok URL instead of the localhost/vercel URL.";
  } else if (channel.channel_type === "telegram") {
    webhookUrl = `${appUrl}/api/webhooks/telegram`;
    instructions = `Set up this Webhook URL for your Telegram bot. Note: If testing locally, use your Ngrok URL instead of the localhost/vercel URL.`;
  } else if (channel.channel_type === "web") {
    webhookUrl = `${appUrl}`;
    instructions = "The Website widget connects automatically via Supabase realtime. No webhook setup required. Just ensure the chat widget is installed on your website.";
  } else {
    webhookUrl = "Not applicable";
    instructions = "No configuration instructions available for this channel type.";
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 capitalize">
            Configure {channel.channel_type}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {instructions}
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Webhook URL</label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={webhookUrl}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-600 focus:outline-none"
              />
              <button 
                onClick={handleCopy}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center"
                title="Copy Webhook URL"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg flex gap-3 mt-6">
            <div>
              <p className="font-medium mb-1">Important</p>
              <p className="text-blue-700/90 text-xs">
                Make sure the API keys for this channel are properly set in your .env.local file.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
