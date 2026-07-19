import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySupportSession } from "@/lib/supportAuth";
import crypto from "crypto";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await verifySupportSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { content, idempotencyKey, attachment } = body;
        const conversationId = params.id;

        if ((!content && !attachment) || !idempotencyKey) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const sAdmin = supabaseAdmin();

        // 1. Conversation Access & 24h Window Validation
        const { data: conversation, error: convErr } = await sAdmin
            .from("support_conversations")
            .select("support_contact_id, channel_type, status, customer_service_window_expires_at, assigned_agent_id, support_contacts(primary_phone)")
            .eq("id", conversationId)
            .single();

        if (convErr || !conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        
        if (conversation.status !== "open") {
            return NextResponse.json({ error: "Cannot send message to a closed conversation" }, { status: 400 });
        }

        // 24-hour window check removed per request

        const contactData = conversation.support_contacts as any;
        const phoneNumber = Array.isArray(contactData) ? contactData[0]?.primary_phone : contactData?.primary_phone;

        // Auto-Assignment logic
        if (!conversation.assigned_agent_id) {
            await sAdmin.from("support_conversations")
                .update({ assigned_agent_id: session.staffId, status: "open" })
                .eq("id", conversationId);
        }

        // 2. Insert Message with Idempotency Key
        const { data: message, error: msgErr } = await sAdmin.from("support_messages").insert({
            conversation_id: conversationId,
            channel_type: conversation.channel_type,
            sender_staff_id: session.staffId,
            sender_type: "staff",
            direction: "outbound",
            body: content || (attachment ? `[${attachment.type.split('/')[0]}]` : ''),
            message_type: attachment ? attachment.type.split('/')[0] : 'text',
            status: conversation.channel_type === 'website' ? 'delivered' : 'queued',
            idempotency_key: `out_${idempotencyKey}`
        }).select("id").single();

        if (msgErr) {
            if (msgErr.code === '23505') {
                return NextResponse.json({ success: true, status: "duplicate" }, { status: 200 });
            }
            throw msgErr;
        }

        // 2.5 Handle Attachment Upload
        if (attachment) {
            const buffer = Buffer.from(attachment.base64, 'base64');
            const fileExt = attachment.name.split('.').pop();
            const filePath = `whatsapp-media/out_${message.id}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await sAdmin.storage
                .from("product-images")
                .upload(filePath, buffer, {
                    contentType: attachment.type,
                    upsert: false
                });
                
            if (!uploadError) {
                const { data: { publicUrl } } = sAdmin.storage.from("product-images").getPublicUrl(filePath);
                await sAdmin.from("support_message_attachments").insert({
                    message_id: message.id,
                    storage_path: publicUrl,
                    mime_type: attachment.type,
                    file_name: attachment.name,
                    file_size: buffer.length
                });
            } else {
                console.error("Failed to upload attachment to Supabase Storage", uploadError);
            }
        }

        // 3. Queue Durable Outbound Job (only for non-website channels)
        if (conversation.channel_type !== 'website') {
            await sAdmin.from("support_outbound_message_jobs").insert({
                support_message_id: message.id,
                channel_type: conversation.channel_type,
                job_status: "pending"
            });
        }

        // 4. Trigger AI Pause in Biriq Store
        if (phoneNumber) {
            const storeUrl = process.env.BIRIQ_STORE_INTERNAL_API_URL || 'http://localhost:3000/api/internal/support/whatsapp/ai-override';
            const secret = process.env.BIRIQ_SUPPORT_INTERNAL_API_SECRET;
            
            fetch(storeUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-biriq-internal-secret": secret || ""
                },
                body: JSON.stringify({ phone_number: phoneNumber, action: "pause" })
            }).catch(e => console.error("Failed to pause AI:", e));
        }

        // 4.5 Trigger Web Push Notification if channel is website
        if (conversation.channel_type === 'website' && conversation.support_contact_id) {
            const pushUrl = (process.env.BIRIQ_STORE_INTERNAL_API_URL?.replace('/whatsapp/ai-override', '/push/send')) || 'http://localhost:3000/api/internal/support/push/send';
            const secret = process.env.BIRIQ_SUPPORT_INTERNAL_API_SECRET;

            fetch(pushUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-biriq-internal-secret": secret || ""
                },
                body: JSON.stringify({ 
                    contactId: conversation.support_contact_id,
                    body: content || (attachment ? 'Sent an attachment' : 'New message'),
                    title: 'Biriq Store Support'
                })
            }).catch(e => console.error("Failed to send push notification:", e));
        }

        // 5. Update Conversation last_message_at
        await sAdmin.from("support_conversations").update({
            last_message_at: new Date().toISOString()
        }).eq("id", conversationId);

        // 6. Fire async worker to process job immediately
        const origin = new URL(req.url).origin;
        fetch(`${origin}/api/support/outbound-worker`, { method: "POST" }).catch(() => {});

        return NextResponse.json({ success: true, messageId: message.id });
    } catch (e: any) {
        console.error("Outbound message API error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
