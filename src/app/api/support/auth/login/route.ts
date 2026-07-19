import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupportSession } from "@/lib/supportAuth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: "Username and password required" }, { status: 400 });
    }

    const s = supabaseAdmin();
    // 1. Find the staff profile by case-insensitive username
    const { data: staff, error: staffError } = await s
      .from('support_staff_profiles')
      .select('id, account_status, support_roles(name)')
      .ilike('username', username)
      .single();

    if (staffError || !staff) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    if (staff.account_status !== 'active') {
      return NextResponse.json({ success: false, message: "Account disabled" }, { status: 403 });
    }

    // 2. Fetch the corresponding auth user to check password
    // We do this by signing in with the synthetic email.
    // The synthetic email pattern is: username@support.biriqstore.internal
    const syntheticEmail = `${username.toLowerCase()}@support.biriqstore.internal`;

    const { data: authData, error: authError } = await s.auth.signInWithPassword({
      email: syntheticEmail,
      password: password
    });

    if (authError || !authData.user) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    // 3. Update last login
    await s.from('support_staff_profiles')
      .update({ last_login: new Date().toISOString(), presence_status: 'online' })
      .eq('id', staff.id);

    // 4. Audit Log
    await s.from('support_audit_logs').insert({
      staff_id: staff.id,
      action: 'login',
      details: { timestamp: new Date().toISOString() }
    });

    // 5. Create secure server-side session
    const roleName = Array.isArray(staff.support_roles) 
        ? staff.support_roles[0]?.name 
        : (staff.support_roles as any)?.name || 'viewer';

    await createSupportSession(staff.id, roleName);

    return NextResponse.json({ success: true, message: "Logged in successfully" });

  } catch (error: any) {
    console.error("Support Login Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
