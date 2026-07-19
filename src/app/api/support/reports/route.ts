import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission } from "@/lib/support/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'reports.view');

    const s = supabaseAdmin();

    // Since we don't have complex aggregations or a time-series DB,
    // we'll return a simple volume summary by status to satisfy the UI requirement without inventing numbers.
    const { data: convs, error } = await s
      .from('support_conversations')
      .select('status, assigned_agent_id, staff:support_staff_profiles(full_name)');

    if (error) throw error;

    const volumeByStatus = convs.reduce((acc: any, c: any) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    const staffPerformance: any = {};
    convs.forEach((c: any) => {
      if (c.assigned_agent_id) {
        const name = c.staff?.full_name || 'Unknown Agent';
        if (!staffPerformance[name]) {
          staffPerformance[name] = { name, assigned: 0, resolved: 0, closed: 0 };
        }
        staffPerformance[name].assigned += 1;
        if (c.status === 'resolved') staffPerformance[name].resolved += 1;
        if (c.status === 'closed') staffPerformance[name].closed += 1;
      }
    });

    return apiSuccess({
      total_conversations: convs.length,
      volume_by_status: volumeByStatus,
      staff_performance: Object.values(staffPerformance)
    });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
