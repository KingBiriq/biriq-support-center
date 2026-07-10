"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { 
    Search, MessageSquare, Phone, Globe, Smartphone, User, 
    Clock, CheckCircle, AlertCircle, Send, Paperclip, MoreVertical,
    ShieldAlert, Hash, Mic, Square, Trash2, ArrowLeft, Info, ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UnifiedInbox({ user }: { user: any }) {
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [customerInfo, setCustomerInfo] = useState<any>(null);
    const [orderInfo, setOrderInfo] = useState<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [showInfoSidebar, setShowInfoSidebar] = useState(false);
    const [viewFilter, setViewFilter] = useState<'open' | 'resolved'>('open');

    // Fetch conversations
    useEffect(() => {
        const fetchConversations = async () => {
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .order('last_message_at', { ascending: false });
                
            if (error) {
                console.error("Fetch conversations error:", error);
                return;
            }

            if (data) {
                const customerIds = data.map(c => c.customer_id).filter(Boolean);
                const whatsappPhones = data
                    .filter(c => c.channel === 'whatsapp' && c.subject?.startsWith('WhatsApp: '))
                    .map(c => '+' + c.subject.replace('WhatsApp: ', '').trim());
                
                let profiles: any[] = [];
                
                if (customerIds.length > 0) {
                    const { data: profsById } = await supabase.from('profiles').select('id, full_name, phone, email').in('id', customerIds);
                    if (profsById) profiles = [...profiles, ...profsById];
                }

                if (whatsappPhones.length > 0) {
                    const { data: profsByPhone } = await supabase.from('profiles').select('id, full_name, phone, email').in('phone', whatsappPhones);
                    if (profsByPhone) {
                        const newProfs = profsByPhone.filter(p => !profiles.find(existing => existing.id === p.id));
                        profiles = [...profiles, ...newProfs];
                    }
                }
                
                const convsWithCustomers = data.map(c => {
                    let matchedCustomer = null;
                    if (c.customer_id) {
                        matchedCustomer = profiles.find(p => p.id === c.customer_id);
                    } else if (c.channel === 'whatsapp' && c.subject?.startsWith('WhatsApp: ')) {
                        const phoneToMatch = '+' + c.subject.replace('WhatsApp: ', '').trim();
                        matchedCustomer = profiles.find(p => p.phone === phoneToMatch);
                    }
                    return {
                        ...c,
                        customer: matchedCustomer
                    };
                });
                
                setConversations(convsWithCustomers);
            }
        };
        fetchConversations();

        const channel = supabase.channel('staff_inbox')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConversations)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Fetch messages for selected conversation
    useEffect(() => {
        if (!selectedConvId) return;

        const fetchMessagesAndInfo = async () => {
            const { data: msgs } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', selectedConvId)
                .order('created_at', { ascending: true });
            if (msgs) {
                setMessages(msgs);
                
                // Mark unread customer messages as read
                const unreadCustomerMsgs = msgs.filter((m: any) => m.sender_type === 'customer' && !m.read_at);
                if (unreadCustomerMsgs.length > 0) {
                    await supabase
                        .from('messages')
                        .update({ read_at: new Date().toISOString() })
                        .eq('conversation_id', selectedConvId)
                        .eq('sender_type', 'customer')
                        .is('read_at', null);
                }
            }

            const conv = conversations.find(c => c.id === selectedConvId);
            if (conv) {
                if (conv.customer) {
                    // Fetch total orders and spent
                    const { data: customerOrders } = await supabase
                        .from('orders')
                        .select('amount_paid')
                        .eq('user_id', conv.customer.id)
                        .in('payment_status', ['PAID', 'COMPLETED', 'CASHBACK_PAID']);
                    
                    if (customerOrders) {
                        const totalOrders = customerOrders.length;
                        const totalSpent = customerOrders.reduce((sum, order) => sum + (Number(order.amount_paid) || 0), 0);
                        setCustomerInfo({ ...conv.customer, totalOrders, totalSpent });
                    } else {
                        setCustomerInfo({ ...conv.customer, totalOrders: 0, totalSpent: 0 });
                    }
                } else {
                    setCustomerInfo(null);
                }
                
                if (conv.order_id) {
                    const { data: ord } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('id', conv.order_id)
                        .single();
                    if (ord) setOrderInfo(ord);
                } else {
                    setOrderInfo(null);
                }
            }
        };

        fetchMessagesAndInfo();

        const channel = supabase.channel(`msgs_${selectedConvId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `conversation_id=eq.${selectedConvId}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedConvId, conversations]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                setRecordedAudio(audioBlob);
                setRecordedAudioUrl(URL.createObjectURL(audioBlob));
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone error:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    };

    const uploadAndSendAudio = async (audioBlob: Blob) => {
        if (!selectedConvId) return;
        const conv = conversations.find(c => c.id === selectedConvId);
        let phone = conv?.subject?.replace("WhatsApp: ", "");
        
        try {
            const formData = new FormData();
            formData.append("file", audioBlob);

            const uploadRes = await fetch("/api/upload-audio", {
                method: "POST",
                body: formData
            });

            if (!uploadRes.ok) {
                throw new Error("Failed to upload audio file.");
            }

            const { url: publicUrl } = await uploadRes.json();

            if (conv?.channel === 'whatsapp') {
                const response = await fetch("/api/whatsapp/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to_number: phone,
                        message: "[Voice note]",
                        message_type: "audio",
                        media_url: publicUrl,
                        conversation_id: selectedConvId,
                        staff_id: user.id
                    })
                });

                if (!response.ok) alert("Failed to send WhatsApp voice message.");
            } else {
                await supabase.from('messages').insert({
                    conversation_id: selectedConvId,
                    sender_type: 'staff',
                    sender_id: user.id,
                    message_type: 'audio',
                    body: '[Voice note]',
                    media_url: publicUrl
                });
            }
        } catch (err) {
            console.error("Voice message error:", err);
            alert("Error sending voice message.");
        }
    };

    const cancelAudio = () => {
        setRecordedAudio(null);
        if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(null);
    };

    const sendAudio = async () => {
        if (recordedAudio) {
            await uploadAndSendAudio(recordedAudio);
            cancelAudio();
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConvId) return;

        const msg = newMessage.trim();
        setNewMessage("");

        const conv = conversations.find(c => c.id === selectedConvId);

        if (conv?.channel === 'whatsapp') {
            let phone = conv.subject?.replace("WhatsApp: ", "");
            if (!phone) {
                alert("Cannot find WhatsApp phone number");
                return;
            }

            try {
                const response = await fetch("/api/whatsapp/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to_number: phone,
                        message: msg,
                        conversation_id: selectedConvId,
                        staff_id: user.id
                    })
                });

                if (!response.ok) {
                    console.error("WhatsApp Send Error:", await response.json());
                    alert("Failed to send WhatsApp message. Check API credentials.");
                }
            } catch (err) {
                console.error("Network error:", err);
                alert("Network error sending WhatsApp message");
            }
        } else {
            await supabase.from('messages').insert({
                conversation_id: selectedConvId,
                sender_type: 'staff',
                sender_id: user.id,
                body: msg
            });

            await supabase.from('conversations').update({
                last_message: msg,
                last_message_at: new Date().toISOString(),
                status: 'open'
            }).eq('id', selectedConvId);
        }
    };

    const handleResolve = async () => {
        if (!selectedConvId) return;
        const conv = conversations.find(c => c.id === selectedConvId);
        if (!conv) return;

        // Optimistic UI update
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, status: 'resolved' } : c));
        setSelectedConvId(null);

        // 1. Update status
        await supabase.from('conversations').update({ status: 'resolved' }).eq('id', selectedConvId);

        // 2. Insert system message
        await supabase.from('messages').insert({
            conversation_id: selectedConvId,
            sender_type: 'system',
            body: 'Chat-kan waa la xaliyey.'
        });

        // 3. Send WhatsApp message if applicable
        if (conv.channel === 'whatsapp') {
            let phone = conv.subject?.replace("WhatsApp: ", "");
            if (phone) {
                try {
                    await fetch("/api/whatsapp/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            to_number: phone,
                            message: "Waad ku mahadsantahay inaad la soo xiriirtay Biriq Support, dhibaatadaadii waa la xalliyey. Maalin Wacan!",
                            conversation_id: selectedConvId,
                            staff_id: user.id
                        })
                    });
                } catch (e) {
                    console.error("Failed to send resolve message via WA", e);
                }
            }
        }
    };

    const getChannelIcon = (channel: string) => {
        switch(channel) {
            case 'whatsapp': return <Phone size={14} className="text-green-500" />;
            case 'telegram': return <MessageSquare size={14} className="text-blue-500" />;
            case 'app': return <Smartphone size={14} className="text-purple-500" />;
            default: return <Globe size={14} className="text-slate-500" />;
        }
    };

    const selectedConv = conversations.find(c => c.id === selectedConvId);

    return (
        <div className="flex h-screen bg-white overflow-hidden relative">
            
            {/* Left Sidebar - Conversations */}
            <div className={cn(
                "w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 absolute inset-0 md:relative z-10 transition-transform duration-300",
                selectedConvId ? "-translate-x-full md:translate-x-0" : "translate-x-0"
            )}>
                <div className="p-4 border-b border-slate-200 bg-white">
                    <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2 mb-4">
                        <MessageSquare size={20} className="text-[#2b3890]" />
                        Inbox
                    </h2>
                    <div className="flex bg-slate-100 p-1 rounded-lg mb-2">
                        <button 
                            className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition", viewFilter === 'open' ? "bg-white shadow-sm text-slate-800" : "text-slate-500")}
                            onClick={() => { setViewFilter('open'); setSelectedConvId(null); }}
                        >
                            Inbox
                        </button>
                        <button 
                            className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition", viewFilter === 'resolved' ? "bg-white shadow-sm text-slate-800" : "text-slate-500")}
                            onClick={() => { setViewFilter('resolved'); setSelectedConvId(null); }}
                        >
                            Resolved
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search chats..." 
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#2b3890]/20"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations
                        .filter(c => viewFilter === 'open' ? (c.status === 'open' || c.status === 'pending') : c.status === 'resolved')
                        .map(conv => (
                        <div 
                            key={conv.id}
                            onClick={() => setSelectedConvId(conv.id)}
                            className={cn(
                                "p-4 border-b border-slate-100 cursor-pointer transition-colors relative",
                                selectedConvId === conv.id ? "bg-blue-50/50" : "hover:bg-slate-100/50"
                            )}
                        >
                            {selectedConvId === conv.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2b3890]" />
                            )}
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    {getChannelIcon(conv.channel)}
                                    <span className="font-semibold text-sm text-slate-900 truncate">
                                        {conv.customer?.full_name || conv.customer?.name || "Guest User"}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-400">
                                    {conv.last_message_at ? format(new Date(conv.last_message_at), 'HH:mm') : ''}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-500 truncate max-w-[200px]">
                                    {conv.last_message || conv.subject}
                                </p>
                                {conv.status === 'open' && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Middle - Chat Area */}
            <div className={cn(
                "flex-1 flex flex-col bg-white absolute inset-0 md:relative z-20 transition-transform duration-300",
                selectedConvId ? "translate-x-0" : "translate-x-full md:translate-x-0"
            )}>
                {selectedConvId ? (
                    <>
                        <div className="h-16 border-b border-slate-200 px-4 md:px-6 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3 md:gap-4">
                                <button 
                                    className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                    onClick={() => setSelectedConvId(null)}
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                    {selectedConv?.customer?.full_name?.charAt(0) || "G"}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate">
                                        {selectedConv?.customer?.full_name || selectedConv?.customer?.name || selectedConv?.subject?.replace('WhatsApp: ', '') || "Guest User"}
                                    </h3>
                                    <p className="text-xs text-slate-500 capitalize flex items-center gap-1">
                                        {getChannelIcon(selectedConv?.channel)}
                                        {selectedConv?.channel} Chat
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 md:gap-2">
                                {selectedConv?.status !== 'resolved' && (
                                    <button 
                                        onClick={handleResolve}
                                        className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition flex items-center gap-1"
                                    >
                                        <CheckCircle size={14} className="hidden md:block" />
                                        <span>Resolve</span>
                                    </button>
                                )}
                                <button 
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 md:hidden"
                                    onClick={() => setShowInfoSidebar(!showInfoSidebar)}
                                >
                                    <Info size={20} />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 hidden md:block">
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                            {messages.map((msg, idx) => {
                                const isStaff = msg.sender_type === 'staff';
                                const isSystem = msg.sender_type === 'system';

                                if (isSystem) {
                                    return (
                                        <div key={idx} className="flex justify-center my-4">
                                            <div className="bg-slate-200/50 text-slate-600 text-xs px-4 py-2 rounded-full max-w-[80%] text-center whitespace-pre-wrap">
                                                {msg.body}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={idx} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`
                                            max-w-[70%] px-4 py-3 text-sm shadow-sm
                                            ${isStaff 
                                                ? 'bg-[#2b3890] text-white rounded-2xl rounded-tr-sm' 
                                                : 'bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-sm'}
                                        `}>
                                            {msg.message_type === 'audio' || msg.message_type === 'voice' ? (
                                                <div className="flex flex-col gap-1">
                                                    <audio controls src={msg.media_url} className="h-10 max-w-[200px]" />
                                                </div>
                                            ) : msg.message_type === 'image' && msg.media_url ? (
                                                <div className="flex flex-col gap-2">
                                                    <img src={msg.media_url} alt="Image" className="max-w-[200px] rounded-lg" />
                                                    {msg.body !== '[Sawir]' && <div className="whitespace-pre-wrap">{msg.body}</div>}
                                                </div>
                                            ) : msg.message_type === 'video' && msg.media_url ? (
                                                <div className="flex flex-col gap-2">
                                                    <video controls src={msg.media_url} className="max-w-[200px] rounded-lg" />
                                                    {msg.body !== '[Muuqaal]' && <div className="whitespace-pre-wrap">{msg.body}</div>}
                                                </div>
                                            ) : (
                                                <div className="whitespace-pre-wrap">{msg.body}</div>
                                            )}
                                            <div className={`text-[10px] mt-1 ${isStaff ? 'text-blue-200' : 'text-slate-400'} text-right`}>
                                                {format(new Date(msg.created_at), 'HH:mm')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 bg-white border-t border-slate-200">
                            <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1 focus-within:border-[#2b3890] focus-within:ring-1 focus-within:ring-[#2b3890]">
                                <button type="button" className="p-3 text-slate-400 hover:text-slate-600 transition-colors">
                                    <Paperclip size={20} />
                                </button>
                                
                                {recordedAudioUrl ? (
                                    <div className="flex-1 flex items-center justify-between px-2 bg-slate-100 rounded-xl m-1 py-1">
                                        <audio controls src={recordedAudioUrl} className="h-8 max-w-[70%]" />
                                        <button type="button" onClick={cancelAudio} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <textarea
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        placeholder={isRecording ? "Recording audio..." : "Type your reply..."}
                                        disabled={isRecording}
                                        className="flex-1 bg-transparent border-none py-3 px-2 resize-none max-h-[120px] focus:ring-0 text-sm disabled:opacity-50"
                                        rows={1}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                    />
                                )}

                                {newMessage.trim() ? (
                                    <button 
                                        type="submit"
                                        className="m-1 w-10 h-10 bg-[#2b3890] text-white rounded-xl flex items-center justify-center shrink-0 transition-colors"
                                    >
                                        <Send size={18} className="ml-0.5" />
                                    </button>
                                ) : recordedAudioUrl ? (
                                    <button 
                                        type="button"
                                        onClick={sendAudio}
                                        className="m-1 w-10 h-10 bg-[#2b3890] text-white rounded-xl flex items-center justify-center shrink-0 transition-colors"
                                    >
                                        <Send size={18} className="ml-0.5" />
                                    </button>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`m-1 w-10 h-10 ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-200 text-slate-600'} rounded-xl flex items-center justify-center shrink-0 transition-colors`}
                                    >
                                        {isRecording ? <Square size={18} /> : <Mic size={18} />}
                                    </button>
                                )}
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="h-full hidden md:flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                        <MessageSquare size={48} className="mb-4 opacity-20" />
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>

            {/* Right Sidebar - Info */}
            <div className={cn(
                "w-full md:w-80 border-l border-slate-200 bg-slate-50/30 overflow-y-auto absolute right-0 inset-y-0 md:relative z-30 transition-transform duration-300 shadow-2xl md:shadow-none bg-white",
                showInfoSidebar ? "translate-x-0" : "translate-x-full md:translate-x-0",
                !selectedConvId && "md:hidden"
            )}>
                {selectedConvId ? (
                    <div className="p-6">
                        {/* Mobile close button */}
                        <div className="md:hidden flex justify-end mb-4">
                            <button onClick={() => setShowInfoSidebar(false)} className="p-2 text-slate-400 bg-slate-100 rounded-full">
                                <ArrowLeft size={16} />
                            </button>
                        </div>
                        
                        {/* Customer Profile */}
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-2xl mx-auto mb-3 shadow-inner">
                                {customerInfo?.full_name?.charAt(0) || "G"}
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">{customerInfo?.full_name || "Guest User"}</h3>
                            <p className="text-sm text-slate-500">{customerInfo?.phone || selectedConv?.subject?.replace('WhatsApp: ', '') || "No contact info"}</p>
                            <p className="text-xs text-slate-400 mt-1">{customerInfo?.email || ""}</p>
                            
                            {/* Stats */}
                            {customerInfo && customerInfo.totalOrders !== undefined && (
                                <div className="grid grid-cols-2 gap-3 mt-5">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <ShoppingBag size={16} className="mx-auto text-[#2b3890] mb-1" />
                                        <div className="text-lg font-black text-slate-800">{customerInfo.totalOrders}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Orders</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <Globe size={16} className="mx-auto text-emerald-500 mb-1" />
                                        <div className="text-lg font-black text-slate-800">${customerInfo.totalSpent?.toFixed(2)}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Spent</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Order Details */}
                        {orderInfo && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                                    <Hash size={14} /> Order Details
                                </h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Order ID</span>
                                        <span className="font-mono font-medium">{orderInfo.order_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Product</span>
                                        <span className="font-medium text-right max-w-[140px] truncate">{orderInfo.package_name || orderInfo.catalogue_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Amount</span>
                                        <span className="font-bold text-green-600">${orderInfo.amount_paid}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                        <span className="text-slate-500">Status</span>
                                        <span className={cn(
                                            "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                                            orderInfo.payment_status === 'PAID' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                        )}>
                                            {orderInfo.payment_status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order Specifics (Player ID, Password) */}
                        {orderInfo && orderInfo.player_id && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                                    <ShieldAlert size={14} /> Game Info
                                </h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-500 text-xs">Player ID / Email</span>
                                        <span className="font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">{orderInfo.player_id}</span>
                                    </div>
                                    {orderInfo.game_password && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-slate-500 text-xs">Password</span>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="password" 
                                                    value={orderInfo.game_password} 
                                                    readOnly 
                                                    className="font-mono bg-slate-50 p-2 rounded-lg border border-slate-100 w-full focus:outline-none"
                                                />
                                                {/* Password visibility toggle could go here */}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        No details to display
                    </div>
                )}
            </div>
        </div>
    );
}
