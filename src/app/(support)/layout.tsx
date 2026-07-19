"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SupportSidebar from "@/components/layout/SupportSidebar";
import { Loader2 } from "lucide-react";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkRole = async (currentUser: any) => {
      if (!currentUser) {
        setUser(null);
        router.replace("/login");
        return;
      }

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", currentUser.id)
        .single();

      if (
        userProfile?.role === "admin" ||
        userProfile?.role === "superadmin" ||
        userProfile?.role === "manager" ||
        userProfile?.role === "support"
      ) {
        setUser(currentUser);
        setProfile(userProfile);
      } else {
        await supabase.auth.signOut();
        setUser(null);
        alert("Waxaad u baahan tahay fasax (Role) si aad u gasho Support Center.");
        router.replace("/login");
      }
      setLoading(false);
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      checkRole(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[AUTH STATE CHANGE]", _event, session?.user?.id);
      if (_event === 'SIGNED_IN' && session?.user) {
        checkRole(session.user);
      } else if (_event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-[#2b3890]" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      <SupportSidebar user={user} profile={profile} />
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {children}
      </main>
    </div>
  );
}
