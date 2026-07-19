import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission, logAuditAction } from "@/lib/support/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'templates.manage');

    const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    if (!ACCESS_TOKEN || !WABA_ID) {
      return apiError("BAD_REQUEST", "Missing Meta credentials (WHATSAPP_ACCESS_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID). Please configure WhatsApp channel.", 400);
    }

    // Fetch templates from Meta API
    const response = await fetch(`https://graph.facebook.com/v19.0/${WABA_ID}/message_templates`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const err = await response.json();
      return apiError("BAD_GATEWAY", `Meta API Error: ${err.error?.message || 'Unknown error'}`, 502);
    }

    const data = await response.json();
    const templates = data.data || [];

    const sAdmin = supabaseAdmin();
    let syncedCount = 0;

    for (const t of templates) {
      // Find components
      const header = t.components.find((c: any) => c.type === 'HEADER');
      const body = t.components.find((c: any) => c.type === 'BODY');
      const footer = t.components.find((c: any) => c.type === 'FOOTER');
      const buttons = t.components.find((c: any) => c.type === 'BUTTONS');

      const headerType = header?.format || 'TEXT';
      const headerContent = header?.text || null;

      // Map to db schema
      const dbRow = {
        meta_template_name: t.name,
        language: t.language,
        category: t.category,
        status: t.status,
        header_type: headerType,
        header_content: headerContent,
        body: body?.text || '',
        footer: footer?.text || null,
        buttons: buttons?.buttons || [],
        variables: [], // Could be extracted if needed
        last_synced_at: new Date().toISOString()
      };

      // Check if exists
      const { data: existing } = await sAdmin
        .from('support_whatsapp_templates')
        .select('id')
        .eq('meta_template_name', t.name)
        .eq('language', t.language)
        .maybeSingle();

      if (existing) {
        await sAdmin.from('support_whatsapp_templates').update(dbRow).eq('id', existing.id);
      } else {
        await sAdmin.from('support_whatsapp_templates').insert(dbRow);
      }
      syncedCount++;
    }

    await logAuditAction(session.staffId, 'templates.synced', { count: syncedCount });

    return apiSuccess({ synced: syncedCount });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
