import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission } from "@/lib/support/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'audit_logs.view');

    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action');
    const staffId = searchParams.get('staff_id');

    let query = supabaseAdmin()
      .from('support_audit_logs')
      .select('*, staff:support_staff_profiles(*)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (action) query = query.eq('action', action);
    if (staffId) query = query.eq('staff_id', staffId);

    const { data, error } = await query;
    if (error) {
      if (error.code === 'PGRST205') return apiSuccess([]); // Table doesn't exist yet
      throw error;
    }

    // Filter out potential sensitive details like tokens just in case
    const safeData = data.map((log: any) => {
      const { password, token, secret, ...safeDetails } = log.details || {};
      return { ...log, details: safeDetails };
    });

    return apiSuccess(safeData);
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
