import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to_number, message, message_type = "text", media_url, conversation_id, staff_id } = body;

    if (!to_number || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      console.error("WhatsApp credentials not configured");
      return NextResponse.json({ error: "WhatsApp integration not configured" }, { status: 500 });
    }

    // Format the number (remove '+' if present)
    const formattedNumber = to_number.replace(/\D/g, "");

    // Prepare payload
    let payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedNumber,
    };

    if (message_type === "text") {
      payload.type = "text";
      payload.text = { preview_url: false, body: message };
    } else if (message_type === "image" && media_url) {
      payload.type = "image";
      payload.image = { link: media_url, caption: message !== "[Sawir]" ? message : undefined };
    } else if (message_type === "video" && media_url) {
      payload.type = "video";
      payload.video = { link: media_url, caption: message !== "[Muuqaal]" ? message : undefined };
    } else if ((message_type === "audio" || message_type === "voice") && media_url) {
      payload.type = "audio";
      payload.audio = { link: media_url };
    } else {
      payload.type = "text";
      payload.text = { body: message }; // fallback
    }

    // Send to WhatsApp API
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API Error:", data);
      return NextResponse.json({ error: "Failed to send WhatsApp message", details: data }, { status: response.status });
    }

    // If successful, insert into our messages table
    if (conversation_id && staff_id) {
      const sAdmin = supabaseAdmin();
      await sAdmin.from("messages").insert({
        conversation_id,
        sender_type: "staff",
        sender_id: staff_id,
        message_type,
        body: message,
        media_url
      });

      // Update conversation
      await sAdmin.from("conversations").update({
        last_message: message.substring(0, 100),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "open",
        assigned_agent_id: staff_id
      }).eq("id", conversation_id);
    }

    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id });

  } catch (error: any) {
    console.error("Error in WhatsApp send API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
