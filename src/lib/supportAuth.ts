import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

const getSecretKey = () => {
  const secret = process.env.SUPPORT_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("CRITICAL: SUPPORT_SESSION_SECRET is missing or less than 32 characters.");
  }
  return new TextEncoder().encode(secret);
};

export async function createSupportSession(staffId: string, roleName: string) {
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

  const sessionToken = await new SignJWT({ staffId, roleName })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set("support_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function verifySupportSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("support_session")?.value;

  console.log("verifySupportSession: TOKEN EXTRACTED?", !!sessionToken);

  if (!sessionToken) {
     console.log("verifySupportSession: MISSING TOKEN!");
     return null;
  }

  try {
    const { payload } = await jwtVerify(sessionToken, getSecretKey());
    console.log("verifySupportSession: VERIFY SUCCESS!", payload.staffId);
    
    // Verify user still exists and is active
    const s = supabaseAdmin();
    const { data: staff, error } = await s
        .from('support_staff_profiles')
        .select('id, account_status, role_id')
        .eq('id', payload.staffId)
        .single();
        
    if (error || !staff) {
        console.error("verifySupportSession Failed: STAFF_PROFILE_MISSING", { staffId: payload.staffId });
        return null;
    }

    if (staff.account_status !== 'active') {
        console.error("verifySupportSession Failed: STAFF_ACCOUNT_DISABLED", { staffId: payload.staffId });
        return null;
    }

    return { staffId: payload.staffId as string, roleName: payload.roleName as string, roleId: staff.role_id };
  } catch (error) {
    return null;
  }
}

export async function clearSupportSession() {
  const cookieStore = await cookies();
  cookieStore.delete("support_session");
}
