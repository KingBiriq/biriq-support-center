import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission, logAuditAction } from "@/lib/support/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'contacts.view');

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('q');

    let query = supabaseAdmin()
      .from("support_contacts")
      .select(`
        *,
        agent:support_staff_profiles(*),
        channels:support_contact_channels(*)
      `)
      .is('deleted_at', null)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      // 1. Fetch Biriq Store profiles for matching phone/email
      const sAdmin = supabaseAdmin();
      const { data: profiles } = await sAdmin.from("profiles").select("full_name, phone_number, email");
      
      const profilesMap: Record<string, string> = {};
      if (profiles) {
        profiles.forEach((p: any) => {
          if (p.phone_number) profilesMap[p.phone_number.replace(/\D/g, '')] = p.full_name;
          if (p.email) profilesMap[p.email.toLowerCase()] = p.full_name;
        });
      }

      // 2. Enrich names and merge duplicate phone contacts
      const mergedMap = new Map<string, any>();

      data.forEach((c: any) => {
        const phone = (c.primary_phone || '').replace(/\D/g, '');
        const email = (c.primary_email || '').toLowerCase();
        const matchedName = profilesMap[phone] || profilesMap[email];

        if (matchedName) {
          c.first_name = matchedName;
          c.last_name = "";
        } else if (!c.first_name || c.first_name.startsWith('Guest')) {
          c.first_name = phone ? `Customer ${phone}` : (c.first_name || 'Customer');
          c.last_name = "";
        }

        const key = phone || email || c.id;

        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key);
          // Combine channels
          const existingChannels = existing.channels || [];
          const newChannels = c.channels || [];
          existing.channels = [...existingChannels, ...newChannels];
        } else {
          mergedMap.set(key, c);
        }
      });

      return apiSuccess(Array.from(mergedMap.values()));
    }

    return apiSuccess(data);
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'contacts.edit');

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return apiError("BAD_REQUEST", "Missing ID", 400);

    const { error } = await supabaseAdmin()
      .from('support_contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    await logAuditAction(session.staffId, 'contact.deleted', { contact_id: id });

    return apiSuccess({ deleted: true });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
