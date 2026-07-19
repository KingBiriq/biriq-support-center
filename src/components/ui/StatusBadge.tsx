import clsx from "clsx";

interface StatusBadgeProps {
  status: "open" | "waiting" | "pending" | "resolved" | "closed" | "snoozed" | "spam" | string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, size = "sm", className }: StatusBadgeProps) {
  let colorClass = "bg-slate-100 text-slate-700 border-slate-200";

  switch (status.toLowerCase()) {
    case "open":
      colorClass = "bg-blue-100 text-blue-700 border-blue-200";
      break;
    case "waiting":
      colorClass = "bg-amber-100 text-amber-700 border-amber-200";
      break;
    case "pending":
      colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
      break;
    case "resolved":
      colorClass = "bg-green-100 text-green-700 border-green-200";
      break;
    case "closed":
      colorClass = "bg-slate-100 text-slate-600 border-slate-200";
      break;
    case "snoozed":
      colorClass = "bg-indigo-100 text-indigo-700 border-indigo-200";
      break;
    case "spam":
      colorClass = "bg-red-100 text-red-700 border-red-200";
      break;
  }

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold",
    md: "text-xs px-2 py-1 rounded uppercase tracking-wider font-bold",
  };

  return (
    <span className={clsx("inline-flex items-center border", colorClass, sizeClasses[size], className)}>
      {status}
    </span>
  );
}
