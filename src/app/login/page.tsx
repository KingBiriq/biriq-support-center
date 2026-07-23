"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoginScreen from "@/components/LoginScreen";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldClear = params.get("clear") === "true";

    if (shouldClear) {
      supabase.auth.signOut().then(() => {
        setLoading(false);
        // Remove the clear param from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          // If already logged in, go to inbox
          router.replace("/");
        } else {
          setLoading(false);
        }
      });
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-[#2b3890]" />
      </div>
    );
  }

  return <LoginScreen onLogin={() => router.replace("/")} />;
}
