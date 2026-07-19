import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/support/permissions';
import { verifySupportSession } from '@/lib/supportAuth';
import { apiSuccess, apiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await verifySupportSession();
    if (!session || !session.staffId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    // Require dashboard.view permission (or super_admin)
    await requirePermission(session.staffId, 'dashboard.view');

    const s = supabaseAdmin();
    
    // Aggregations using RPC or direct queries.
    // For now we'll do raw counts via select.
    // In production, an RPC or proper materialized view is better.
    
    // Using simple queries for now:
    const [
      { count: openCount },
      { count: waitingCount },
      { count: unassignedCount },
      { count: unreadCount },
      { count: resolvedCount },
      { count: closedCount },
      { count: snoozedCount },
      { count: whatsappCount },
      { count: websiteCount }
    ] = await Promise.all([
      s.from('support_conversations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      s.from('support_conversations').select('*', { count: 'exact', head: true }).eq('status', 'waiting'),
      s.from('support_conversations').select('*', { count: 'exact', head: true }).is('assigned_agent_id', null),
      s.from('support_conversations').select('*', { count: 'exact', head: true }).gt('unread_count', 0),
      s.from('support_conversations').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
      s.from('support_conversations').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
      s.from('support_conversations').select('*', { count: 'exact', head: true }).eq('status', 'snoozed'),
      s.from('support_conversations').select('*', { count: 'exact', head: true }).eq('channel_type', 'whatsapp'),
      s.from('support_conversations').select('*', { count: 'exact', head: true }).eq('channel_type', 'website')
    ]);

    // Calculate metrics
    const metrics = {
      open: openCount || 0,
      waiting: waitingCount || 0,
      unassigned: unassignedCount || 0,
      unread: unreadCount || 0,
      resolved: resolvedCount || 0,
      closed: closedCount || 0,
      snoozed: snoozedCount || 0,
      channels: {
        whatsapp: whatsappCount || 0,
        website: websiteCount || 0
      }
    };

    // Calculate volume data for the last 7 days
    const volumeData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      // In production, use grouped queries. For now, fetch and filter or simulate if counts are low.
      const { data: convs } = await s
        .from('support_conversations')
        .select('id, channel_type, created_at')
        .gte('created_at', `${dateStr}T00:00:00Z`)
        .lt('created_at', `${dateStr}T23:59:59Z`);

      const whatsapp = convs?.filter(c => c.channel_type === 'whatsapp').length || 0;
      const website = convs?.filter(c => c.channel_type === 'website').length || 0;
      
      volumeData.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        whatsapp,
        website,
        total: whatsapp + website
      });
    }

    const charts = {
      volume: volumeData,
      channels: [
        { name: 'WhatsApp', value: metrics.channels.whatsapp, color: '#16a34a' },
        { name: 'Website', value: metrics.channels.website, color: '#4f46e5' }
      ]
    };

    return apiSuccess({ metrics, charts });

  } catch (err: any) {
    if (err.message.includes('Forbidden')) return apiError('FORBIDDEN', err.message, 403);
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}
