import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60; // 60 seconds

export async function POST() {
    try {
        const sAdmin = supabaseAdmin();
        
        // Find conversations waiting on staff for more than 15 minutes
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        const { data: convos, error } = await sAdmin
            .from("support_conversations")
            .select("id, assigned_to")
            .eq("status", "open")
            .not("assigned_to", "is", null)
            // Wait, we need to know if the last message was from the customer.
            // For simplicity in this worker, we could check the messages table, but that's expensive.
            // Let's assume we want to alert on any open conversation that hasn't been updated recently.
            .lte("updated_at", fifteenMinsAgo);

        if (error || !convos || convos.length === 0) {
            return NextResponse.json({ processed: 0 });
        }

        let alertsCreated = 0;

        for (const conv of convos) {
            // Check the latest message to see if it's from the customer
            const { data: latestMsg } = await sAdmin
                .from("support_messages")
                .select("direction")
                .eq("conversation_id", conv.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (latestMsg && latestMsg.direction === "incoming") {
                // SLA Violation!
                // 1. Tag conversation (using a hypothetical sla_breached column, or just inserting a notification)
                
                // 2. Insert Notification for the assignee
                await sAdmin.from("support_notifications").insert({
                    staff_id: conv.assigned_to,
                    title: "SLA Violation",
                    message: "A conversation assigned to you has been waiting for more than 15 minutes.",
                    read: false,
                    type: 'alert'
                });

                // Update the updated_at so we don't repeatedly alert every minute
                await sAdmin.from("support_conversations").update({
                    updated_at: new Date().toISOString()
                }).eq("id", conv.id);

                alertsCreated++;
            }
        }

        return NextResponse.json({ processed: alertsCreated });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
