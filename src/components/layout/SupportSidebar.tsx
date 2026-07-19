"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, Inbox, Users, ShoppingCart, CreditCard, 
  ShieldUser, BarChart2, Radio, Zap, LayoutTemplate, 
  Bell, Settings, ScrollText, LogOut, ChevronLeft, ChevronRight, Menu, Send
} from "lucide-react";

interface SupportSidebarProps {
  user: any;
  profile: any;
}

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inbox", href: "/", icon: Inbox },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Team", href: "/team", icon: ShieldUser },
  { name: "Reports", href: "/reports", icon: BarChart2 },
  { name: "Channels", href: "/channels", icon: Radio },
  { name: "Quick Replies", href: "/quick-replies", icon: Zap },
  { name: "Templates", href: "/templates", icon: LayoutTemplate },
  { name: "Bulk Send", href: "/campaigns", icon: Send },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Audit Logs", href: "/audit-logs", icon: ScrollText },
];

export default function SupportSidebar({ user, profile }: SupportSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const SidebarContent = (
    <div className={`flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
        {!collapsed && <span className="font-bold text-[#2b3890] text-lg truncate">Biriq Support</span>}
        {collapsed && <span className="font-bold text-[#2b3890] text-lg mx-auto">BS</span>}
        
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="hidden md:flex p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group relative ${
                isActive 
                  ? "bg-[#2b3890]/10 text-[#2b3890] font-medium" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={20} className={`shrink-0 ${collapsed ? "mx-auto" : "mr-3"} ${isActive ? "text-[#2b3890]" : "text-slate-500 group-hover:text-slate-700"}`} />
              {!collapsed && <span className="truncate">{item.name}</span>}
              
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-slate-200 shrink-0">
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          <div className="flex items-center min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            
            {!collapsed && (
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {profile?.full_name || "Support Agent"}
                </p>
                <p className="text-xs text-slate-500 truncate capitalize">
                  {profile?.role || "Agent"}
                </p>
              </div>
            )}
          </div>

          {!collapsed && (
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors shrink-0"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
        {collapsed && (
          <button 
            onClick={handleLogout}
            className="mt-3 w-full p-2 flex justify-center text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors group relative"
          >
            <LogOut size={18} />
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap">
              Logout
            </div>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button (visible only on small screens) */}
      <button 
        id="mobile-sidebar-menu-btn"
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-sm border border-slate-200"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu size={20} className="text-slate-600" />
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-full shrink-0 z-40">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 w-64 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {SidebarContent}
      </aside>
    </>
  );
}
