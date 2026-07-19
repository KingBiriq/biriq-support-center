import { MessageCircle, Globe, Smartphone, Send, MessagesSquare } from "lucide-react";
import clsx from "clsx";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

interface ChannelBadgeProps {
  channelType?: "whatsapp" | "website" | "telegram" | "instagram" | "facebook" | "mobile_app" | string;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ChannelBadge({ 
  channelType = "whatsapp", 
  showIcon = true, 
  showLabel = true, 
  size = "sm",
  className 
}: ChannelBadgeProps) {
  let icon = <MessagesSquare size={14} />;
  let label = "Unknown";
  let colorClass = "bg-slate-100 text-slate-700 border-slate-200";

  switch ((channelType || "").toLowerCase()) {
    case "whatsapp":
      icon = <WhatsAppIcon size={size === "sm" ? 14 : size === "md" ? 16 : 20} />;
      label = "WhatsApp";
      colorClass = "bg-green-50 text-green-700 border-green-200";
      break;
    case "website":
    case "app": // Legacy handling
      icon = <Globe size={size === "sm" ? 14 : size === "md" ? 16 : 20} />;
      label = "Website Chat";
      colorClass = "bg-purple-50 text-purple-700 border-purple-200";
      break;
    case "telegram":
      icon = <Send size={size === "sm" ? 14 : size === "md" ? 16 : 20} className="transform -rotate-45" />;
      label = "Telegram";
      colorClass = "bg-sky-50 text-sky-700 border-sky-200";
      break;
    case "mobile_app":
      icon = <Smartphone size={size === "sm" ? 14 : size === "md" ? 16 : 20} />;
      label = "Mobile App";
      colorClass = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    default:
      label = channelType;
      break;
  }

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 rounded",
    md: "text-xs px-2 py-1 rounded-md",
    lg: "text-sm px-3 py-1.5 rounded-lg",
  };

  return (
    <span className={clsx("inline-flex items-center font-medium border", colorClass, sizeClasses[size], className)}>
      {showIcon && <span className={clsx(showLabel && "mr-1.5")}>{icon}</span>}
      {showLabel && label}
    </span>
  );
}
