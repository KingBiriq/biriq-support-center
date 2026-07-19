import { Clock, AlertTriangle } from "lucide-react";

interface ServiceWindowCardProps {
  expiresAt: string | null;
  lastMessageAt: string | null;
}

export function ServiceWindowCard({ expiresAt, lastMessageAt }: ServiceWindowCardProps) {
  if (!expiresAt) return null;

  const windowTime = new Date(expiresAt).getTime();
  const isActive = windowTime > Date.now();
  
  let timeRemaining = "";
  if (isActive) {
    const diff = windowTime - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    timeRemaining = `${hours}h ${minutes}m`;
  }

  const lastMsgFormatted = lastMessageAt 
    ? new Date(lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "N/A";

  return (
    <div className={`p-4 rounded-xl border mb-4 shadow-sm ${isActive ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-[#fff7ed] border-[#fed7aa]'}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          {isActive ? <Clock size={14} className="text-green-600" /> : <AlertTriangle size={14} className="text-orange-500" />}
          Service Window
        </h4>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isActive ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          {isActive ? 'ACTIVE' : 'EXPIRED'}
        </span>
      </div>
      
      <div className="flex flex-col gap-1.5 mt-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500 text-xs">Expires in:</span>
          <span className={`font-bold text-lg ${isActive ? 'text-green-700' : 'text-orange-600'}`}>
            {isActive ? timeRemaining : '0h 0m'}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs pt-1 border-t border-black/5 mt-1">
          <span className="text-slate-500">Last customer message:</span>
          <span className="text-slate-700 font-medium">{lastMsgFormatted}</span>
        </div>
      </div>
    </div>
  );
}
