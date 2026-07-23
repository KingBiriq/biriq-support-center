"use client";
import { useState, useEffect, useRef } from "react";
import { MessageCircle, SmilePlus, Paperclip, Image as ImageIcon, FileText, Mic, MapPin, LayoutTemplate, X } from "lucide-react";
import useSWR from "swr";
import { ChannelBadge } from "@/components/ui/ChannelBadge";

export default function WhatsAppComposer({ conversation, onMessageSent }: { conversation: any, onMessageSent: () => void }) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyFilter, setQuickReplyFilter] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Fetch quick replies
  const { data: quickReplies } = useSWR('/api/support/quick-replies', async (url) => {
    const res = await fetch(url);
    const json = await res.json();
    return json.success ? json.data.filter((r: any) => r.is_active) : [];
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachment(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      setError("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (conversation?.id) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [conversation?.id]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !attachment) return;
    setIsSending(true);
    setError(null);
    try {
      let attachmentData = null;
      if (attachment) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(attachment);
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // remove data:image/jpeg;base64,
          };
          reader.onerror = error => reject(error);
        });
        
        attachmentData = {
          name: attachment.name,
          type: attachment.type,
          base64
        };
      }

      // Use standard UUID directly for Next.js to avoid crypto node polyfill issues if any
      const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
      const res = await fetch(`/api/support/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          idempotencyKey: uuid,
          attachment: attachmentData
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      
      setMessage("");
      setAttachment(null);
      onMessageSent();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSending(false);
    }
  };

  const isWhatsApp = conversation.channel_type === 'whatsapp' || (conversation.channel_type === 'website' && conversation.subject?.includes('WhatsApp'));

  const filteredQuickReplies = (quickReplies || []).filter((qr: any) => 
    qr.shortcut.toLowerCase().includes(quickReplyFilter.toLowerCase()) ||
    qr.title.toLowerCase().includes(quickReplyFilter.toLowerCase())
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);
    
    // Check if we should show quick replies
    const lastWord = val.split(/\s+/).pop();
    if (lastWord && lastWord.startsWith('/')) {
      setShowQuickReplies(true);
      setQuickReplyFilter(lastWord);
    } else {
      setShowQuickReplies(false);
    }
  };

  const insertQuickReply = (qr: any) => {
    // Replace the typed shortcut with the full body
    const words = message.split(/\s+/);
    words.pop(); // remove the partial shortcut
    const newMsg = words.length > 0 ? words.join(' ') + ' ' + qr.body + ' ' : qr.body + ' ';
    setMessage(newMsg);
    setShowQuickReplies(false);
  };
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const { data: templates } = useSWR(showTemplateModal ? '/api/support/templates' : null, async (url) => {
    const res = await fetch(url);
    const json = await res.json();
    return json.success ? json.data : [];
  });

  const sendTemplate = async () => {
    if (!selectedTemplate) return;
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/conversations/${conversation.id}/messages/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: selectedTemplate.meta_template_name,
          templateLanguage: selectedTemplate.language
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send template');
      
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      onMessageSent();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 relative">
      {error && <div className="text-red-500 text-xs font-medium bg-red-50 p-2 rounded-md border border-red-100">{error}</div>}
      
      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-md flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Select WhatsApp Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50">
              {!templates ? (
                <div className="text-center text-slate-500 py-4 text-sm">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center text-slate-500 py-4 text-sm">No templates found.</div>
              ) : (
                templates.map((t: any) => (
                  <button 
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedTemplate?.id === t.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                  >
                    <div className="font-semibold text-sm text-slate-800">{t.meta_template_name}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{t.body}</div>
                  </button>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
              <button 
                onClick={sendTemplate}
                disabled={!selectedTemplate || isSending}
                className="px-4 py-2 bg-[#25D366] text-white text-sm font-medium rounded-md hover:bg-[#128C7E] disabled:opacity-50"
              >
                {isSending ? 'Sending...' : 'Send Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Replies Popover */}
      {showQuickReplies && filteredQuickReplies.length > 0 && (
        <div className="absolute bottom-[80px] left-0 w-full md:w-2/3 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden max-h-64 flex flex-col">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Quick Replies
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredQuickReplies.map((qr: any) => (
              <button
                key={qr.id}
                onClick={() => insertQuickReply(qr)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-md transition-colors flex flex-col gap-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-mono text-xs bg-blue-50 px-1.5 py-0.5 rounded">{qr.shortcut}</span>
                  <span className="font-medium text-sm text-slate-700">{qr.title}</span>
                </div>
                <span className="text-xs text-slate-500 truncate">{qr.body}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className={`border rounded-lg bg-slate-50 flex flex-col transition-colors focus-within:border-[#2b3890] focus-within:ring-1 focus-within:ring-[#2b3890] border-slate-300`}>
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setAttachment(e.target.files[0]);
            }
          }} 
          accept="image/*,audio/*,video/*,application/pdf,.doc,.docx"
        />

        {attachment && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-2 rounded-md mx-3 mt-3 mb-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <Paperclip size={14} className="text-blue-500 shrink-0" />
              <span className="text-xs text-slate-700 truncate">{attachment.name}</span>
            </div>
            <button onClick={() => setAttachment(null)} className="text-slate-400 hover:text-red-500 p-1">
              <X size={14} />
            </button>
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center justify-between bg-red-50 p-4 min-h-[60px] animate-pulse">
            <div className="flex items-center gap-3 text-red-600">
              <Mic size={20} className="animate-bounce" />
              <span className="font-semibold text-sm">Recording Voice Note...</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-red-500 font-mono text-sm">
                {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
              <button type="button" onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm">
                Stop & Save
              </button>
            </div>
          </div>
        ) : (
          <textarea 
            ref={inputRef}
            autoFocus
            value={message}
            onChange={handleTextChange}
            placeholder={attachment ? "Add a caption..." : "Type your message..."}
            className="w-full min-h-[60px] max-h-[200px] bg-transparent resize-none p-3 text-sm focus:outline-none placeholder-slate-400 text-slate-800 disabled:cursor-not-allowed"
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
          />
        )}
        
        {/* Toolbar & Send Button */}
        <div className="flex items-center justify-between p-2 pt-0">
          <div className="flex items-center gap-1 text-slate-400">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-slate-200 hover:text-slate-600 rounded disabled:opacity-50"><Paperclip size={18} /></button>
            <button type="button" onClick={() => { if(fileInputRef.current){ fileInputRef.current.accept="image/*"; fileInputRef.current.click(); } }} className="hidden sm:block p-1.5 hover:bg-slate-200 hover:text-slate-600 rounded disabled:opacity-50"><ImageIcon size={18} /></button>
            <button type="button" onClick={() => { if(fileInputRef.current){ fileInputRef.current.accept="application/pdf,.doc,.docx"; fileInputRef.current.click(); } }} className="hidden sm:block p-1.5 hover:bg-slate-200 hover:text-slate-600 rounded disabled:opacity-50"><FileText size={18} /></button>
            <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`hidden md:block p-1.5 hover:bg-slate-200 rounded disabled:opacity-50 ${isRecording ? 'text-red-500 bg-red-100' : 'hover:text-slate-600'}`}>
              <Mic size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isWhatsApp ? (
              <button 
                type="button" 
                onClick={() => setShowTemplateModal(true)}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-1.5 rounded-md font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                <LayoutTemplate size={16} />
                Select Template
              </button>
            ) : null}
            <button 
              onClick={sendMessage}
              disabled={isSending || (!message.trim() && !attachment)}
              className={`px-4 py-1.5 rounded-md font-medium text-sm transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-white
                ${isWhatsApp ? 'bg-[#25D366] hover:bg-[#128C7E]' : 'bg-[#2b3890] hover:bg-blue-800'}
              `}
            >
              {isWhatsApp && <MessageCircle size={16} />}
              {isSending ? 'Sending...' : isWhatsApp ? 'Send WhatsApp' : 'Send Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
