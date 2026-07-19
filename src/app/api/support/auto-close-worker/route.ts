import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60; // 60 seconds

export async function POST() {
    try {
        const sAdmin = supabaseAdmin();
        
        // Find open conversations whose last message is older than 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: convos, error } = await sAdmin
            .from("support_conversations")
            .select("id")
            .eq("status", "open")
            .lte("updated_at", sevenDaysAgo);

        if (error || !convos || convos.length === 0) {
            return NextResponse.json({ processed: 0 });
        }

        let closedCount = 0;

        for (const conv of convos) {
            const { error: updateErr } = await sAdmin
                .from("support_conversations")
                .update({
                    status: "closed",
                    updated_at: new Date().toISOString()
                })
                .eq("id", conv.id);
            
            if (!updateErr) closedCount++;
        }

        return NextResponse.json({ processed: closedCount });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
