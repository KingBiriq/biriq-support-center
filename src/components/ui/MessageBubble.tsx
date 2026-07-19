import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import clsx from "clsx";

interface MessageBubbleProps {
  message: any;
  channelType?: string;
}

export function MessageBubble({ message, channelType }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound" || message.sender_type === "staff" || message.sender_type === "ai";
  const isAi = message.sender_type === "ai";
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Outbound background based on WhatsApp default
  const outboundBg = isAi ? "bg-[#e0f7fa] text-[#006064]" : "bg-[#d9fdd3] text-[#111b21]"; 
  const inboundBg = "bg-[#ffffff] text-[#111b21]";

  // Status icon for outbound
  let StatusIcon = <Check size={14} className="text-[#8696a0]" />;
  if (message.status === "delivered") StatusIcon = <CheckCheck size={14} className="text-[#8696a0]" />;
  if (message.status === "read") StatusIcon = <CheckCheck size={14} className="text-[#53bdeb]" />;
  if (message.status === "failed") StatusIcon = <AlertCircle size={14} className="text-red-500" />;
  if (message.status === "sending") StatusIcon = <Clock size={12} className="text-[#8696a0]" />;

  return (
    <div className={clsx("flex flex-col max-w-[85%] mb-2 relative z-10", isOutbound ? "ml-auto items-end" : "mr-auto items-start")}>
      {/* Sender Info above bubble for inbound, or small text below */}
      <span className="text-[11px] font-medium text-[#667781] mb-0.5 px-1 drop-shadow-sm bg-white/40 rounded-full backdrop-blur-sm self-start ml-2">
        {!isOutbound && (message.sender?.full_name || "Customer")}
      </span>
      
      <div 
        className={clsx(
          "px-2.5 py-1.5 rounded-lg shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] relative max-w-full min-w-[80px]",
          isOutbound ? outboundBg : inboundBg,
          isOutbound ? "rounded-tr-none" : "rounded-tl-none",
          isAi ? "border border-cyan-200" : ""
        )}
      >
        {/* Tail SVG */}
        {isOutbound ? (
          <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -right-[8px] text-[#d9fdd3] fill-current">
            <path opacity="0.13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
            <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
          </svg>
        ) : (
          <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-[8px] text-[#ffffff] fill-current">
            <path opacity="0.13" fill="#00000000" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path>
            <path fill="currentColor" d="M1.533 2.568 8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path>
          </svg>
        )}

        <div className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words pb-[14px] pr-2 text-black">
          {message.body || <span className="italic text-slate-400">Empty message</span>}
        </div>
        
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1 flex flex-col gap-1 pb-4">
            {message.attachments.map((att: any) => {
              const mime = att.mime_type || "";
              if (mime.startsWith("image/")) {
                return <img key={att.id} src={att.storage_path} alt="Attachment" className="max-w-[220px] rounded-md" />;
              } else if (mime.startsWith("audio/")) {
                return <audio key={att.id} src={att.storage_path} controls className="max-w-[250px] h-[40px]" />;
              } else if (mime.startsWith("video/")) {
                return <video key={att.id} src={att.storage_path} controls className="max-w-[250px] rounded-md" />;
              } else {
                return (
                  <a key={att.id} href={att.storage_path} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/5 rounded-md text-sm text-[#027eb5] hover:underline">
                    📄 Document
                  </a>
                );
              }
            })}
          </div>
        )}

        {/* Time and Status */}
        <div className={clsx("absolute bottom-[3px] right-[7px] flex items-center gap-1 text-[11px] whitespace-nowrap", isOutbound ? "text-[#667781]" : "text-[#667781]")}>
          <span className="leading-none mt-[2px]">{time}</span>
          {isOutbound && <span className="leading-none">{StatusIcon}</span>}
        </div>
      </div>
      
      {/* Sender Info below bubble for outbound */}
      {isOutbound && (
        <span className="text-[11px] font-medium text-[#667781] mt-0.5 px-1 drop-shadow-sm bg-white/40 rounded-full backdrop-blur-sm self-end mr-2">
          {isAi ? "AI Assistant" : (message.sender?.full_name || "Support Staff")}
        </span>
      )}
    </div>
  );
}

export function InternalNoteBubble({ message }: { message: any }) {
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col max-w-[85%] mx-auto mb-4 items-center">
      <div className="px-5 py-3 rounded-xl bg-amber-50/80 border border-amber-200 shadow-sm relative text-center">
        <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
          Internal Note
        </div>
        <div className="text-[13px] text-amber-900 leading-relaxed whitespace-pre-wrap break-words">
          {message.body}
        </div>
        <div className="flex items-center justify-center gap-1 mt-1.5 text-[10px] text-amber-600/70">
          <span>{message.sender?.full_name || "Staff"}</span>
          <span>•</span>
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
}
