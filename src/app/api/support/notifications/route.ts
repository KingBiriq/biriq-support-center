import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission } from "@/lib/support/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'notifications.view_own');

    const s = supabaseAdmin();
    const { data, error } = await s
      .from('support_notifications')
      .select('*')
      .eq('staff_id', session.staffId)
      .order('created_at', { ascending: false });

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

    await requirePermission(session.staffId, 'notifications.view_own');

    const { id, is_read } = await req.json();
    if (!id) return apiError("BAD_REQUEST", "Missing ID", 400);

    const s = supabaseAdmin();

    // Verify ownership
    const { data: notif } = await s.from('support_notifications').select('staff_id').eq('id', id).single();
    if (!notif) return apiError("NOT_FOUND", "Not found", 404);
    if (notif.staff_id !== session.staffId) return apiError("FORBIDDEN", "Forbidden", 403);

    const { error } = await s
      .from('support_notifications')
      .update({ is_read, read_at: is_read ? new Date().toISOString() : null })
      .eq('id', id);

    if (error) throw error;

    return apiSuccess({ updated: true });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
