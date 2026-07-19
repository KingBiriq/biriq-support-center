import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // Basic Telegram webhook verification
        if (!body.message) {
            return NextResponse.json({ success: true });
        }

        const telegramMessage = body.message;
        const chatId = telegramMessage.chat?.id?.toString();
        const text = telegramMessage.text;
        const fromName = telegramMessage.from?.first_name || "Telegram User";

        if (!chatId || !text) {
            return NextResponse.json({ success: true });
        }

        const sAdmin = supabaseAdmin();

        // 1. Find or create channel identity
        const { data: channelIdentity, error: identityErr } = await sAdmin
            .from("support_contact_channels")
            .select("id, support_contact_id")
            .eq("channel_type", "telegram")
            .eq("external_contact_id", chatId)
            .maybeSingle();

        let contactId;
        let identityId;

        if (!channelIdentity) {
            // Create contact first
            const { data: contact, error: contactErr } = await sAdmin
                .from("support_contacts")
                .insert({
                    display_name: fromName,
                    lifecycle: 'lead'
                })
                .select("id")
                .single();

            if (contactErr) throw contactErr;
            contactId = contact.id;

            // Create identity
            const { data: newIdentity, error: newIdErr } = await sAdmin
                .from("support_contact_channels")
                .insert({
                    support_contact_id: contactId,
                    channel_type: "telegram",
                    external_contact_id: chatId,
                    display_name: fromName,
                    is_primary: true
                })
                .select("id")
                .single();

            if (newIdErr) throw newIdErr;
            identityId = newIdentity.id;
        } else {
            contactId = channelIdentity.support_contact_id;
            identityId = channelIdentity.id;
        }

        // 2. Find or create open conversation
        const { data: activeConv, error: convErr } = await sAdmin
            .from("support_conversations")
            .select("id")
            .eq("support_contact_id", contactId)
            .eq("channel_type", "telegram")
            .in("status", ["open", "pending", "snoozed"])
            .maybeSingle();

        let conversationId;

        if (activeConv) {
            conversationId = activeConv.id;
            // Update last customer message time
            await sAdmin.from("support_conversations").update({
                last_message_at: new Date().toISOString(),
                last_customer_message_at: new Date().toISOString(),
                unread_count: 1, // increment logic normally requires rpc, simplified here
                status: "open"
            }).eq("id", conversationId);
        } else {
            // Create new conversation
            const { data: newConv, error: newConvErr } = await sAdmin
                .from("support_conversations")
                .insert({
                    support_contact_id: contactId,
                    channel_type: "telegram",
                    channel_identity_id: identityId,
                    status: "open",
                    subject: text.substring(0, 50),
                    last_message_at: new Date().toISOString(),
                    last_customer_message_at: new Date().toISOString(),
                    unread_count: 1
                })
                .select("id")
                .single();
            
            if (newConvErr) throw newConvErr;
            conversationId = newConv.id;
        }

        // 3. Insert the message
        await sAdmin.from("support_messages").insert({
            conversation_id: conversationId,
            channel_type: "telegram",
            sender_type: "customer",
            direction: "inbound",
            message_type: "text",
            body: text,
            external_message_id: telegramMessage.message_id?.toString(),
            status: "delivered"
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Telegram webhook error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
