import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60; // 60 seconds

export async function POST() {
    try {
        const sAdmin = supabaseAdmin();
        const { data: jobs, error } = await sAdmin
            .from("support_outbound_message_jobs")
            .select("*, support_messages(*, support_conversations(*, support_contacts(*)), support_message_attachments(*))")
            .eq("job_status", "pending")
            .lte("next_retry_at", new Date().toISOString())
            .order("created_at", { ascending: true })
            .limit(10);

        if (error || !jobs || jobs.length === 0) {
            return NextResponse.json({ processed: 0 });
        }

        const token = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        
        let processedCount = 0;

        for (const job of jobs) {
            // Mark processing
            await sAdmin.from("support_outbound_message_jobs").update({
                job_status: "processing",
                locked_at: new Date().toISOString()
            }).eq("id", job.id);

            const msg = job.support_messages;
            const rawPhone = msg?.support_conversations?.support_contacts?.primary_phone || "";
            let toPhone = rawPhone.replace(/\D/g, "");

            if (!toPhone || rawPhone.startsWith("guest-") || toPhone.length < 7) {
              const subject = msg?.support_conversations?.subject || "";
              const match = subject.match(/\d{7,}/);
              if (match) toPhone = match[0];
            }

            try {
                let metaRes: Response;
                let metaData: any;
                if (job.channel_type === "whatsapp") {
                    if (!token || !phoneId || !toPhone) {
                        throw new Error(`Missing WhatsApp credentials or target phone number (Phone: ${rawPhone})`);
                    }
                    
                    const attachments = msg.support_message_attachments || [];
                    const attachment = attachments.length > 0 ? attachments[0] : null;

                    let payload: any = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: toPhone
                    };

                    if (msg.message_type === 'template') {
                        let templateData = { name: "hello_world", language: "en_US" };
                        try {
                            templateData = JSON.parse(msg.body);
                        } catch(e) {}
                        
                        payload.type = "template";
                        payload.template = {
                            name: templateData.name,
                            language: { code: templateData.language }
                        };
                    } else if (attachment) {
                        const url = attachment.storage_path;
                        const mime = attachment.mime_type || "";
                        if (mime.startsWith('image/')) {
                            payload.type = "image";
                            payload.image = { link: url, caption: msg.body };
                        } else if (mime.startsWith('video/')) {
                            payload.type = "video";
                            payload.video = { link: url, caption: msg.body };
                        } else if (mime.startsWith('audio/')) {
                            // Audio does not support captions
                            payload.type = "audio";
                            payload.audio = { link: url };
                        } else {
                            payload.type = "document";
                            payload.document = { link: url, filename: attachment.file_name, caption: msg.body };
                        }
                    } else {
                        payload.type = "text";
                        payload.text = { preview_url: false, body: msg.body };
                    }

                    // Call Meta Graph API
                    metaRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    });
                    metaData = await metaRes.json();
                } else if (job.channel_type === "telegram") {
                    if (!telegramToken || !toPhone) {
                        throw new Error("Missing Telegram credentials or target chat ID");
                    }
                    // toPhone for Telegram is the chat ID
                    metaRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            chat_id: toPhone,
                            text: msg.body
                        })
                    });
                    metaData = await metaRes.json();
                } else {
                    throw new Error(`Unsupported channel type: ${job.channel_type}`);
                }

                if (metaRes && metaRes.ok) {
                    let externalMessageId = null;
                    
                    if (job.channel_type === "whatsapp" && metaData?.messages?.[0]?.id) {
                        externalMessageId = metaData.messages[0].id;
                    } else if (job.channel_type === "telegram" && metaData?.result?.message_id) {
                        externalMessageId = metaData.result.message_id.toString();
                    }
                    
                    // Update Message
                    await sAdmin.from("support_messages").update({
                        external_message_id: externalMessageId,
                        status: "sent" 
                    }).eq("id", msg.id);

                    // Complete Job
                    await sAdmin.from("support_outbound_message_jobs").update({
                        job_status: "completed",
                        completed_at: new Date().toISOString()
                    }).eq("id", job.id);

                } else {
                    throw new Error(`External API Error: ${JSON.stringify(metaData)}`);
                }
            } catch (err: any) {
                const attempts = job.attempts + 1;
                const nextRetry = new Date(Date.now() + Math.pow(2, attempts) * 1000 * 60).toISOString();
                const isPermanent = err.message.includes("Graph API Error") && (err.message.includes("131047") || err.message.includes("OAuthException"));
                
                // Also update message status if dead letter
                const newStatus = isPermanent || attempts >= job.max_attempts ? "dead_letter" : "pending";
                
                await sAdmin.from("support_outbound_message_jobs").update({
                    job_status: newStatus,
                    attempts: attempts,
                    next_retry_at: nextRetry,
                    last_error: err.message
                }).eq("id", job.id);

                if (newStatus === "dead_letter") {
                    await sAdmin.from("support_messages").update({
                        status: "failed",
                        external_error_details: err.message
                    }).eq("id", msg.id);
                }
            }
            processedCount++;
        }

        return NextResponse.json({ processed: processedCount });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
