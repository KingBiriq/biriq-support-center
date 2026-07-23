import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60; // 60 seconds

export async function POST() {
    try {
        const sAdmin = supabaseAdmin();
        
        // 1. Lock a batch of pending media jobs
        const { data: jobs, error: fetchErr } = await sAdmin
            .from("support_media_jobs")
            .select("*")
            .in("status", ["pending", "retrying"])
            .lte("next_retry_at", new Date().toISOString())
            .order("created_at", { ascending: true })
            .limit(10);
            
        // If next_retry_at is null, we can also fetch them by using an or condition.
        const { data: nullRetryJobs, error: nullErr } = await sAdmin
            .from("support_media_jobs")
            .select("*")
            .in("status", ["pending", "retrying"])
            .is("next_retry_at", null)
            .order("created_at", { ascending: true })
            .limit(10);
            
        let allJobs = [...(jobs || []), ...(nullRetryJobs || [])];
        // Deduplicate
        const jobMap = new Map();
        allJobs.forEach(j => jobMap.set(j.id, j));
        allJobs = Array.from(jobMap.values()).slice(0, 10);
            
        if (!allJobs || allJobs.length === 0) {
            return NextResponse.json({ success: true, message: "No media jobs to process" });
        }

        const jobIds = allJobs.map(j => j.id);
        await sAdmin
            .from("support_media_jobs")
            .update({ status: "processing", updated_at: new Date().toISOString() })
            .in("id", jobIds);

        const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

        if (!WHATSAPP_ACCESS_TOKEN) {
            throw new Error("Missing WhatsApp configuration variables");
        }

        // 2. Process each job
        for (const job of allJobs) {
            try {
                // Step A: Get Media URL from Meta
                const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${job.external_media_id}`, {
                    headers: {
                        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`
                    }
                });
                
                const mediaData = await mediaRes.json();
                
                if (!mediaRes.ok || !mediaData.url) {
                    throw new Error(mediaData.error?.message || "Failed to get media URL from Meta");
                }
                
                // Step B: Download binary data
                const fileRes = await fetch(mediaData.url, {
                    headers: {
                        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`
                    }
                });
                
                if (!fileRes.ok) {
                    throw new Error(`Failed to download media file: ${fileRes.statusText}`);
                }
                
                const arrayBuffer = await fileRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                const mimeType = mediaData.mime_type || fileRes.headers.get('content-type') || 'application/octet-stream';
                
                // Determine file extension
                let ext = 'bin';
                if (mimeType.includes('image/jpeg')) ext = 'jpg';
                else if (mimeType.includes('image/png')) ext = 'png';
                else if (mimeType.includes('audio/ogg')) ext = 'ogg';
                else if (mimeType.includes('audio/mp4')) ext = 'm4a';
                else if (mimeType.includes('video/mp4')) ext = 'mp4';
                else if (mimeType.includes('application/pdf')) ext = 'pdf';
                
                const fileName = `wa_media_${job.external_media_id}.${ext}`;
                const storagePath = `whatsapp-media/in_${job.message_id}_${Date.now()}.${ext}`;
                
                // Step C: Upload to Supabase Storage
                const { error: uploadError } = await sAdmin.storage
                    .from("product-images")
                    .upload(storagePath, buffer, {
                        contentType: mimeType,
                        upsert: false
                    });
                    
                if (uploadError) {
                    throw new Error(`Storage upload failed: ${uploadError.message}`);
                }
                
                // Step D: Get Public URL and insert into attachments
                const { data: { publicUrl } } = sAdmin.storage.from("product-images").getPublicUrl(storagePath);
                
                await sAdmin.from("support_message_attachments").insert({
                    message_id: job.message_id,
                    storage_path: publicUrl,
                    mime_type: mimeType,
                    file_name: fileName,
                    file_size: buffer.length
                });

                // Mark job complete
                await sAdmin
                    .from("support_media_jobs")
                    .update({ status: "completed", updated_at: new Date().toISOString() })
                    .eq("id", job.id);
                    
            } catch (error: any) {
                console.error(`[MEDIA-WORKER] Failed job ${job.id}:`, error.message);
                const attempts = (job.attempts || 0) + 1;
                const status = attempts >= (job.max_attempts || 3) ? "failed" : "retrying";
                
                const backoffMs = Math.pow(2, attempts) * 1000 * 60; // 2m, 4m, 8m...
                const nextRetry = new Date(Date.now() + backoffMs).toISOString();

                await sAdmin
                    .from("support_media_jobs")
                    .update({ 
                        status, 
                        attempts, 
                        error: error.message,
                        next_retry_at: nextRetry,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", job.id);
            }
        }

        return NextResponse.json({ success: true, processed: allJobs.length });
    } catch (error: any) {
        console.error("[MEDIA-WORKER] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
