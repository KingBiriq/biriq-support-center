import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySupportSession } from "@/lib/supportAuth";
import crypto from "crypto";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await verifySupportSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { templateId, templateName, templateLanguage } = body;
        const conversationId = params.id;

        if (!templateName || !templateLanguage) {
            return NextResponse.json({ error: "Missing template details" }, { status: 400 });
        }

        const sAdmin = supabaseAdmin();

        // 1. Conversation Access
        const { data: conversation, error: convErr } = await sAdmin
            .from("support_conversations")
            .select("channel_type, status, subject, support_contacts(primary_phone)")
            .eq("id", conversationId)
            .single();

        if (convErr || !conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        
        const isWhatsApp = conversation.channel_type === 'whatsapp' || (conversation.channel_type === 'website' && conversation.subject?.includes('WhatsApp'));
        if (!isWhatsApp) return NextResponse.json({ error: "Templates can only be sent on WhatsApp" }, { status: 400 });

        const idempotencyKey = crypto.randomUUID();
        const templatePayload = JSON.stringify({ name: templateName, language: templateLanguage });

        // Auto assign if unassigned
        await sAdmin.from("support_conversations")
            .update({ assigned_agent_id: session.staffId, status: "open" })
            .is("assigned_agent_id", null)
            .eq("id", conversationId);

        // 2. Insert Message
        const { data: message, error: msgErr } = await sAdmin.from("support_messages").insert({
            conversation_id: conversationId,
            channel_type: 'whatsapp',
            sender_staff_id: session.staffId,
            sender_type: "staff",
            direction: "outbound",
            body: templatePayload,
            message_type: 'template',
            status: 'queued',
            idempotency_key: `out_tpl_${idempotencyKey}`
        }).select("id").single();

        if (msgErr) throw msgErr;

        // 3. Queue Durable Outbound Job
        await sAdmin.from("support_outbound_message_jobs").insert({
            support_message_id: message.id,
            channel_type: 'whatsapp',
            job_status: "pending"
        });

        // 4. Update Conversation last_message_at
        await sAdmin.from("support_conversations").update({
            last_message_at: new Date().toISOString()
        }).eq("id", conversationId);

        // 5. Fire async worker to process job immediately
        const origin = new URL(req.url).origin;
        fetch(`${origin}/api/support/outbound-worker`, { method: "POST" }).catch(() => {});

        return NextResponse.json({ success: true, data: message });

    } catch (error: any) {
        console.error("Template Send Error:", error);
        return NextResponse.json({ error: error.message || "Failed to send template" }, { status: 500 });

    }
}
