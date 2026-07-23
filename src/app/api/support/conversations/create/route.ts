import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySupportSession } from "@/lib/supportAuth";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { phone_number } = await req.json();
    if (!phone_number) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const cleanPhone = phone_number.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 7) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const sAdmin = supabaseAdmin();

    // 1. Check or create contact
    let { data: contact } = await sAdmin
      .from("support_contacts")
      .select("id")
      .eq("primary_phone", cleanPhone)
      .single();

    if (!contact) {
      // Check Biriq Store profile for name
      const { data: profile } = await sAdmin
        .from("profiles")
        .select("full_name")
        .eq("phone_number", cleanPhone)
        .single();

      const fullName = profile?.full_name || `WhatsApp: ${cleanPhone}`;

      const { data: newContact, error: createErr } = await sAdmin
        .from("support_contacts")
        .insert({
          primary_phone: cleanPhone,
          full_name: fullName,
        })
        .select("id")
        .single();

      if (createErr) throw createErr;
      contact = newContact;
    }

    // 2. Check for existing open/active conversation
    let { data: conversation } = await sAdmin
      .from("support_conversations")
      .select("*")
      .eq("support_contact_id", contact.id)
      .eq("channel_type", "whatsapp")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      // Create conversation
      const { data: newConv, error: convErr } = await sAdmin
        .from("support_conversations")
        .insert({
          support_contact_id: contact.id,
          channel_type: "whatsapp",
          subject: `WhatsApp: ${cleanPhone}`,
          status: "open",
          assigned_agent_id: session.staffId,
          last_message_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (convErr) throw convErr;
      conversation = newConv;
    }

    return NextResponse.json({ success: true, conversation });
  } catch (e: any) {
    console.error("Create conversation error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
