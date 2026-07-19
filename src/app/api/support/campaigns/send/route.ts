import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission, logAuditAction } from "@/lib/support/permissions";
import crypto from "crypto";

export const maxDuration = 60; // Allow up to 60 seconds processing time

function formatSomaliPhone(raw: string): string | null {
  let clean = raw.replace(/\D/g, ""); // Remove non-digits
  if (clean.startsWith("00")) {
    clean = clean.substring(2);
  }
  if (clean.startsWith("0")) {
    clean = "252" + clean.substring(1);
  }
  if (clean.length === 9 && (clean.startsWith("6") || clean.startsWith("7") || clean.startsWith("9"))) {
    clean = "252" + clean;
  }
  
  // Valid Somalia numbers are usually 12 digits starting with 252
  if (clean.startsWith("252") && clean.length === 12) {
    return clean;
  }
  
  // Return null if it doesn't look like a valid phone number format
  return clean.length >= 7 ? clean : null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Use templates.manage permission for broadcast campaigns
    await requirePermission(session.staffId, "templates.manage");

    const body = await req.json();
    const { 
      templateName, 
      templateLanguage, 
      manualNumbers = "", 
      includeSavedContacts = false, 
      includeWebsiteGuests = false 
    } = body;

    if (!templateName || !templateLanguage) {
      return NextResponse.json({ error: "Missing template details" }, { status: 400 });
    }

    const sAdmin = supabaseAdmin();
    const numbersSet = new Set<string>();

    // 1. Parse manual numbers
    if (manualNumbers && typeof manualNumbers === "string") {
      const parts = manualNumbers.split(/[\n,;]+/);
      for (const part of parts) {
        const formatted = formatSomaliPhone(part.trim());
        if (formatted) {
          numbersSet.add(formatted);
        }
      }
    }

    // 2. Fetch Saved Contacts if requested
    if (includeSavedContacts) {
      const { data: contacts } = await sAdmin
        .from("support_contacts")
        .select("primary_phone")
        .is("deleted_at", null);
      
      if (contacts) {
        for (const c of contacts) {
          if (c.primary_phone) {
            const formatted = formatSomaliPhone(c.primary_phone);
            if (formatted) {
              numbersSet.add(formatted);
            }
          }
        }
      }
    }

    // 3. Fetch Website Guests if requested (website sessions that contain WhatsApp subject)
    if (includeWebsiteGuests) {
      const { data: convs } = await sAdmin
        .from("support_conversations")
        .select("subject, support_contacts(primary_phone)")
        .eq("channel_type", "website");

      if (convs) {
        for (const conv of convs) {
          // Check subject for WhatsApp phone
          if (conv.subject && conv.subject.startsWith("WhatsApp: ")) {
            const phone = conv.subject.replace("WhatsApp: ", "").trim();
            const formatted = formatSomaliPhone(phone);
            if (formatted) {
              numbersSet.add(formatted);
            }
          }
          
          // Fallback check contact's primary phone
          const contactPhone = (conv.support_contacts as any)?.primary_phone;
          if (contactPhone && !contactPhone.startsWith("guest-")) {
            const formatted = formatSomaliPhone(contactPhone);
            if (formatted) {
              numbersSet.add(formatted);
            }
          }
        }
      }
    }

    const finalNumbers = Array.from(numbersSet);
    if (finalNumbers.length === 0) {
      return NextResponse.json({ error: "No valid recipient numbers found." }, { status: 400 });
    }

    const templatePayload = JSON.stringify({ name: templateName, language: templateLanguage });
    let queuedCount = 0;

    for (const number of finalNumbers) {
      try {
        // Find or create Contact
        let { data: contact } = await sAdmin
          .from("support_contacts")
          .select("id")
          .eq("primary_phone", number)
          .maybeSingle();

        if (!contact) {
          const last4 = number.substring(number.length - 4);
          const { data: newContact, error: insertErr } = await sAdmin
            .from("support_contacts")
            .insert({
              primary_phone: number,
              display_name: `Guest #${last4}`,
              updated_at: new Date().toISOString()
            })
            .select("id")
            .single();
          
          if (insertErr) continue;
          contact = newContact;
        }

        // Find or create open WhatsApp Conversation
        let { data: conversation } = await sAdmin
          .from("support_conversations")
          .select("id")
          .eq("support_contact_id", contact.id)
          .eq("channel_type", "whatsapp")
          .eq("status", "open")
          .maybeSingle();

        if (!conversation) {
          const { data: newConv, error: convErr } = await sAdmin
            .from("support_conversations")
            .insert({
              support_contact_id: contact.id,
              status: "open",
              priority: "normal",
              channel_type: "whatsapp",
              customer_service_window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              last_message_at: new Date().toISOString(),
              last_customer_message_at: new Date().toISOString(),
              unread_count: 0
            })
            .select("id")
            .single();

          if (convErr) continue;
          conversation = newConv;
        }

        // Insert Template Message
        const idempotencyKey = crypto.randomUUID();
        const { data: message, error: msgErr } = await sAdmin
          .from("support_messages")
          .insert({
            conversation_id: conversation.id,
            channel_type: "whatsapp",
            sender_staff_id: session.staffId,
            sender_type: "staff",
            direction: "outbound",
            body: templatePayload,
            message_type: "template",
            status: "queued",
            idempotency_key: `bulk_${idempotencyKey}`
          })
          .select("id")
          .single();

        if (msgErr) continue;

        // Insert Job
        await sAdmin.from("support_outbound_message_jobs").insert({
          support_message_id: message.id,
          channel_type: "whatsapp",
          job_status: "pending"
        });

        queuedCount++;
      } catch (err) {
        console.error(`Error sending bulk message to ${number}:`, err);
      }
    }

    // Fire outbound worker asynchronously to process queued jobs
    const origin = new URL(req.url).origin;
    fetch(`${origin}/api/support/outbound-worker`, { method: "POST" }).catch(() => {});

    // Log action to audit logs
    await logAuditAction(session.staffId, "campaign.bulk_send", { 
      templateName, 
      recipientsCount: finalNumbers.length,
      queuedCount
    });

    return NextResponse.json({ 
      success: true, 
      recipientsCount: finalNumbers.length,
      queuedCount
    });

  } catch (error: any) {
    console.error("Bulk Send API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process campaign" }, { status: 500 });
  }
}
