import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission } from "@/lib/support/permissions";
import { apiSuccess, apiError } from "@/lib/api-utils";
import crypto from "crypto";

// Biriq Support Center proxy to Biriq Store Internal API
export async function GET(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'payments.view');

    const searchParams = req.nextUrl.searchParams.toString();
    
    const secret = process.env.BIRIQ_SUPPORT_INTERNAL_API_SECRET;
    if (!secret) throw new Error("Missing BIRIQ_SUPPORT_INTERNAL_API_SECRET");

    const timestamp = Date.now().toString();
    const requestId = crypto.randomUUID();
    
    const searchString = searchParams ? `?${searchParams}` : '';
    const payload = `${timestamp}.${requestId}.${searchString}`;
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    const baseUrl = process.env.BIRIQ_STORE_INTERNAL_API_URL || 'http://localhost:3000';
    const targetUrl = new URL("/api/internal/support/payments", baseUrl);
    targetUrl.search = searchParams;

    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        "x-biriq-signature-256": signature,
        "x-biriq-timestamp": timestamp,
        "x-biriq-request-id": requestId,
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      let errText = await response.text();
      let errMsg = "Failed to fetch payments from store";
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error || errJson.message || errMsg;
      } catch(e) {}
      
      if (response.status === 404) return apiError("NOT_FOUND", "Endpoint not found", 404);
      if (response.status === 401) return apiError("UNAUTHORIZED", "Internal API signature invalid", 401);
      return apiError("INTERNAL_ERROR", `Store API error ${response.status}: ${errMsg}`, response.status);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
