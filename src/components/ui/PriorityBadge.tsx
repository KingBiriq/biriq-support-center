import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import clsx from "clsx";

interface PriorityBadgeProps {
  priority: "low" | "medium" | "high" | "urgent" | string;
  size?: "sm" | "md";
  className?: string;
}

export function PriorityBadge({ priority, size = "sm", className }: PriorityBadgeProps) {
  let icon = <Minus size={12} />;
  let colorClass = "bg-slate-100 text-slate-700 border-slate-200";

  switch (priority.toLowerCase()) {
    case "low":
      icon = <ArrowDown size={size === "sm" ? 12 : 14} />;
      colorClass = "bg-slate-100 text-slate-600 border-slate-200";
      break;
    case "medium":
      icon = <Minus size={size === "sm" ? 12 : 14} />;
      colorClass = "bg-blue-50 text-blue-600 border-blue-200";
      break;
    case "high":
      icon = <ArrowUp size={size === "sm" ? 12 : 14} />;
      colorClass = "bg-orange-50 text-orange-600 border-orange-200";
      break;
    case "urgent":
      icon = <ArrowUp size={size === "sm" ? 12 : 14} />;
      colorClass = "bg-red-50 text-red-600 border-red-200";
      break;
  }

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold",
    md: "text-xs px-2 py-1 rounded uppercase tracking-wider font-bold",
  };

  return (
    <span className={clsx("inline-flex items-center border", colorClass, sizeClasses[size], className)}>
      <span className="mr-1">{icon}</span>
      {priority}
    </span>
  );
}
