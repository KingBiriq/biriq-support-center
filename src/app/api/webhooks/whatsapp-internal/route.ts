import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60; // 60 seconds

export async function POST(req: NextRequest) {
    try {
        const signature = req.headers.get("x-biriq-signature-256");
        const timestamp = req.headers.get("x-biriq-timestamp");
        const requestId = req.headers.get("x-biriq-request-id");
        const eventKey = req.headers.get("x-biriq-event-key");

        if (!signature || !timestamp || !requestId || !eventKey) {
            return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
        }

        // Validate timestamp (5 min tolerance)
        const now = Date.now();
        const ts = parseInt(timestamp, 10);
        if (isNaN(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
            return NextResponse.json({ error: "Expired timestamp" }, { status: 408 });
        }

        const rawBody = await req.text();
        const secret = process.env.BIRIQ_SUPPORT_INTERNAL_API_SECRET;
        
        if (!secret) {
            console.error("Missing BIRIQ_SUPPORT_INTERNAL_API_SECRET");
            return NextResponse.json({ error: "Internal Configuration Error" }, { status: 500 });
        }

        const dataToSign = `${timestamp}.${requestId}.${eventKey}.${rawBody}`;
        const expectedSignature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

        // Constant time comparison
        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const sAdmin = supabaseAdmin();
        
        // Check for deduplication
        const { data: existingEvent } = await sAdmin
            .from("support_whatsapp_webhook_events")
            .select("id")
            .eq("event_key", eventKey)
            .single();

        if (existingEvent) {
            return NextResponse.json({ status: "duplicate" }, { status: 200 });
        }

        // Insert event
        let payload;
        try {
            payload = JSON.parse(rawBody);
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const { data: newEvent, error: insertError } = await sAdmin.from("support_whatsapp_webhook_events").insert({
            event_key: eventKey,
            event_type: "whatsapp_message",
            payload: payload,
            signature_valid: true,
            processing_status: "received"
        }).select("id").single();

        if (insertError) {
            if (insertError.code === '23505') { // Unique violation, race condition safe
                return NextResponse.json({ status: "duplicate" }, { status: 200 });
            }
            throw insertError;
        }

        // --- Core Processing Logic ---
        await processWhatsAppPayload(payload, sAdmin, newEvent.id);

        return NextResponse.json({ status: "accepted" }, { status: 200 });
    } catch (e: any) {
        console.error("Support Center Internal Webhook Error:", e);
        return NextResponse.json({ error: "Processing failure", details: e.message }, { status: 500 });
    }
}

async function processWhatsAppPayload(payload: any, sAdmin: any, eventId: string) {
    try {
        const hasEntry = Array.isArray(payload?.entry);
        const value = hasEntry 
            ? payload?.entry?.[0]?.changes?.[0]?.value 
            : payload;
        const message = value?.messages?.[0];
        const status = value?.statuses?.[0];
        const contact = value?.contacts?.[0];

        // Mark processing
        await sAdmin.from("support_whatsapp_webhook_events").update({ processing_status: "processing" }).eq("id", eventId);

        if (status) {
            // Handle Outgoing Message Status Update
            const { error: statusErr } = await sAdmin.from("support_messages").update({
                status: status.status // sent, delivered, read, failed
            }).eq("external_message_id", status.id);
            
            if (statusErr) console.error("Error updating status:", statusErr);
        }

        if (message) {
            const fromNumber = (message.from || "").replace(/\D/g, "");
            const contactName = contact?.profile?.name || "Customer";
            const messageId = message.id;

            let messageText = "";
            let mediaId = null;

            if (message.type === "text") {
                messageText = message.text?.body || "";
            } else if (message.type === "button") {
                messageText = message.button?.text || "[Button]";
            } else if (message.type === "interactive") {
                const interactive = message.interactive;
                if (interactive?.type === "button_reply") {
                    messageText = interactive.button_reply?.title || "[Button Reply]";
                } else if (interactive?.type === "list_reply") {
                    messageText = interactive.list_reply?.title || "[List Reply]";
                } else {
                    messageText = "[Interactive]";
                }
            } else if (["image", "video", "audio", "voice", "document"].includes(message.type)) {
                mediaId = message[message.type]?.id;
                messageText = message[message.type]?.caption || `[${message.type}]`;
            } else {
                messageText = `[${message.type}]`;
            }

            // 1. Sync Contact
            let { data: supportContact, error: contactErr } = await sAdmin.from("support_contacts")
                .select("id")
                .eq("primary_phone", fromNumber)
                .maybeSingle();

            if (contactErr) {
                throw new Error(`Contact lookup failed: ${contactErr.message}`);
            }

            if (!supportContact) {
                const { data: newContact, error: insertContactErr } = await sAdmin.from("support_contacts")
                    .insert({
                        primary_phone: fromNumber,
                        display_name: contactName,
                        updated_at: new Date().toISOString()
                    })
                    .select("id")
                    .single();

                if (insertContactErr) {
                    throw new Error(`Contact insert failed: ${insertContactErr.message}`);
                }
                supportContact = newContact;
            } else {
                // Update display name if it's currently a default
                const { error: updateContactErr } = await sAdmin.from("support_contacts")
                    .update({
                        display_name: contactName,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", supportContact.id);

                if (updateContactErr) {
                    console.error(`Warning: Contact update failed: ${updateContactErr.message}`);
                }
            }

            // 2. Sync Conversation
            const { data: conversation, error: convSelectErr } = await sAdmin.from("support_conversations")
                .select("id, unread_count")
                .eq("support_contact_id", supportContact.id)
                .eq("status", "open")
                .maybeSingle();

            if (convSelectErr) {
                throw new Error(`Conversation select failed: ${convSelectErr.message}`);
            }

            let convId = conversation?.id;

            if (!convId) {
                const { data: newConv, error: convInsertErr } = await sAdmin.from("support_conversations").insert({
                    support_contact_id: supportContact.id,
                    status: "open",
                    priority: "normal",
                    channel_type: "whatsapp",
                    customer_service_window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    last_message_at: new Date().toISOString(),
                    last_customer_message_at: new Date().toISOString(),
                    unread_count: 1
                }).select("id").single();
                
                if (convInsertErr) {
                    throw new Error(`Conversation insert failed: ${convInsertErr.message}`);
                }
                convId = newConv?.id;
                
                if (convId) {
                    import("@/lib/support/assignment").then(mod => {
                        mod.autoAssignConversation(convId).catch(console.error);
                    });
                }
            } else {
                // Extend 24h window and update last message details
                const { error: convUpdateErr } = await sAdmin.from("support_conversations").update({
                    customer_service_window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    last_message_at: new Date().toISOString(),
                    last_customer_message_at: new Date().toISOString(),
                    unread_count: (conversation.unread_count || 0) + 1
                }).eq("id", convId);
                
                if (convUpdateErr) {
                    throw new Error(`Conversation update failed: ${convUpdateErr.message}`);
                }
            }

            // 3. Insert Message
            if (convId) {
                const { data: msgData, error: msgErr } = await sAdmin.from("support_messages").insert({
                    conversation_id: convId,
                    sender_type: "customer",
                    direction: "inbound",
                    body: messageText,
                    external_message_id: messageId,
                    idempotency_key: `inc_${messageId}`,
                    status: "delivered",
                    channel_type: "whatsapp"
                }).select("id").single();

                if (msgErr) {
                    if (msgErr.code !== '23505') {
                        throw new Error(`Message insert failed: ${msgErr.message}`);
                    }
                } else if (mediaId && msgData) {
                    // Enqueue media job
                    const { error: mediaErr } = await sAdmin.from("support_media_jobs").insert({
                        external_media_id: mediaId,
                        message_id: msgData.id,
                        status: "pending"
                    });
                    if (mediaErr) {
                        console.error("Error inserting media job:", mediaErr.message);
                    }
                }

                if (convId) {
                    // OLD AI HAS BEEN REMOVED FROM HERE
                    // AI HANDLING IS NOW DONE IN BIRIQ STORE PRO WEBHOOK
                }
            }
        }

        // Mark processed
        await sAdmin.from("support_whatsapp_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", eventId);
    } catch (err: any) {
        await sAdmin.from("support_whatsapp_webhook_events").update({ processing_status: "failed", last_error: err.message }).eq("id", eventId);
        throw err;
    }
}
