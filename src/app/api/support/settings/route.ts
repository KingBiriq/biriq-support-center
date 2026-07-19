import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission, logAuditAction } from "@/lib/support/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

const ALLOWED_SETTINGS = [
  'company_name',
  'timezone',
  'default_language',
  'business_hours',
  'assignment_method',
  'auto_close_hours',
  'sla_first_response_minutes',
  'sla_resolution_minutes',
  'notifications_enabled',
  'appearance'
];

export async function GET(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'settings.view');

    const s = supabaseAdmin();
    const { data, error } = await s.from('support_settings').select('*');

    if (error) {
        if (error.code === 'PGRST205') return apiSuccess([]); // Table doesn't exist yet
        throw error;
    }

    return apiSuccess(data);
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'settings.manage');

    const updates = await req.json();

    // Validate keys against allowlist
    const validUpdates: any = {};
    for (const key of Object.keys(updates)) {
      if (!ALLOWED_SETTINGS.includes(key)) {
        return apiError("BAD_REQUEST", `Invalid setting key: ${key}`, 400);
      }
      validUpdates[key] = updates[key];
    }

    if (Object.keys(validUpdates).length === 0) {
      return apiSuccess({ updated: true });
    }

    const s = supabaseAdmin();
    
    // Upsert valid settings
    const upserts = Object.entries(validUpdates).map(([k, v]) => ({
      key: k,
      value: v,
      updated_by: session.staffId
    }));

    const { error } = await s
      .from('support_settings')
      .upsert(upserts, { onConflict: 'key' });

    if (error) throw error;

    await logAuditAction(session.staffId, 'settings.updated', { updates: validUpdates });

    return apiSuccess({ updated: true });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
