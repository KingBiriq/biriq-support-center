import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as Blob;
        
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `voice-staff-${Date.now()}.webm`;
        const filePath = `whatsapp-media/${fileName}`;

        const { data, error } = await supabaseAdmin().storage
            .from("product-images")
            .upload(filePath, buffer, {
                contentType: 'audio/webm',
                cacheControl: "3600",
                upsert: false
            });

        if (error) {
            console.error("Storage upload error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { data: { publicUrl } } = supabaseAdmin().storage
            .from("product-images")
            .getPublicUrl(filePath);

        return NextResponse.json({ url: publicUrl }, { status: 200 });

    } catch (error: any) {
        console.error("Upload handler error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
