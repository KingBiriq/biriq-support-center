import { supabaseAdmin } from "@/lib/supabase";

/**
 * Ensures the staff has an active account and valid permissions.
 * Also returns the profile info for context logging.
 */
export async function requirePermission(staffId: string, permissionName: string) {
  const s = supabaseAdmin();
  
  // 1. Get staff profile and roles
  const { data: staff, error: staffErr } = await s
    .from("support_staff_profiles")
    .select("id, account_status, role_id")
    .eq("id", staffId)
    .single();

  if (staffErr || !staff) {
    throw new Error("Staff profile not found");
  }

  if (staff.account_status !== 'active') {
    throw new Error("Staff account is disabled");
  }

  if (!staff.role_id) {
    throw new Error("Staff has no assigned role");
  }

  // 2. Resolve role
  const { data: role, error: roleErr } = await s
    .from("support_roles")
    .select("id, name")
    .eq("id", staff.role_id)
    .single();

  if (roleErr || !role) {
    throw new Error("Staff role not found");
  }

  // Super admin bypasses permission checks (explicitly only super_admin)
  if (role.name === 'super_admin') {
    return { staff, role };
  }

  // 3. Resolve permissions
  const { data: perms, error: permErr } = await s
    .from("support_role_permissions")
    .select(`
      permission:support_permissions(name)
    `)
    .eq("role_id", role.id);

  if (permErr) {
    throw new Error("Error resolving role permissions");
  }

  const hasPermission = (perms || []).some((p: any) => p.permission?.name === permissionName);

  if (!hasPermission) {
    throw new Error(`Forbidden: Requires permission ${permissionName}`);
  }

  return { staff, role };
}

/**
 * Logs an action to support_audit_logs.
 */
export async function logAuditAction(staffId: string, action: string, details: any, ipAddress?: string) {
  const s = supabaseAdmin();
  await s.from("support_audit_logs").insert({
    staff_id: staffId,
    action,
    details,
    ip_address: ipAddress || null
  });
}
