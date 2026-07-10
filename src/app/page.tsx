"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoginScreen from "@/components/LoginScreen";
import UnifiedInbox from "@/components/UnifiedInbox";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async (currentUser: any) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (profile?.role === "admin" || profile?.role === "superadmin" || profile?.role === "manager" || profile?.role === "support") {
        setUser(currentUser);
      } else {
        await supabase.auth.signOut();
        setUser(null);
        alert("Waxaad u baahan tahay fasax (Role) si aad u gasho Support Center. Fadlan la xidhiidh Admin-ka.");
      }
      setLoading(false);
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      checkRole(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !user) {
         checkRole(session.user);
      } else if (!session?.user) {
         setUser(null);
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
    return <LoginScreen onLogin={setUser} />;
  }

  return <UnifiedInbox user={user} />;
}
