import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission } from "@/lib/support/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'settings.manage');

    const body = await req.json();
    const { channel_type, display_name } = body;

    if (!channel_type || !display_name) {
        return apiError("INVALID_INPUT", "Missing required fields", 400);
    }

    const s = supabaseAdmin();
    
    // Test if table exists by doing a select first
    const { error: testErr } = await s.from('support_channels').select('id').limit(1);
    if (testErr && testErr.code === 'PGRST205') {
        return apiError("NOT_INITIALIZED", "Support channels table does not exist. Please run database migrations.", 500);
    }

    const { data, error } = await s.from('support_channels').insert({
        channel_type,
        display_name,
        status: 'disconnected',
        created_by: session.staffId
    }).select().single();

    if (error) {
        throw error;
    }

    return apiSuccess(data);
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
