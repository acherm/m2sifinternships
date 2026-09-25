// Supabase Edge Function: send the internship assignment email through Resend.
//
// Called from the browser by an administrator (supabase.functions.invoke).
// The caller's JWT is verified, their role must be "admin", and every value
// placed in the HTML is escaped. The Resend key is a function secret:
//   supabase secrets set RESEND_API_KEY=... SITE_URL=https://...
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405)

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const resendKey = Deno.env.get("RESEND_API_KEY") ?? ""
    const siteUrl = (Deno.env.get("SITE_URL") ?? "https://m2sif2627.istic.univ-rennes1.fr").replace(/\/$/, "")

    if (!resendKey) return json({ success: false, error: "RESEND_API_KEY secret not configured" }, 500)

    // 1. Who is calling? Use the caller's JWT.
    const authHeader = req.headers.get("Authorization") ?? ""
    if (!authHeader.startsWith("Bearer ")) return json({ success: false, error: "Unauthorized" }, 401)
    const asCaller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const {
      data: { user },
      error: userError,
    } = await asCaller.auth.getUser()
    if (userError || !user) return json({ success: false, error: "Unauthorized" }, 401)

    // 2. Only administrators send assignment emails.
    const service = createClient(supabaseUrl, serviceKey)
    const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).single()
    if (!profile || profile.role !== "admin") return json({ success: false, error: "Forbidden" }, 403)

    // 3. Validate the payload.
    const body = await req.json().catch(() => ({}))
    const { studentEmail, studentName, subjectTitle, supervisorName } = body as Record<string, unknown>
    if (typeof studentEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      return json({ success: false, error: "Invalid student email" }, 400)
    }

    const safeStudentName = escapeHtml(studentName)
    const safeSubjectTitle = escapeHtml(subjectTitle)
    const safeSupervisorName = escapeHtml(supervisorName)

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Internship Assignment Confirmation</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .header p { color: white; margin: 10px 0 0 0; font-size: 16px; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef; }
    .assignment-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
    .cta-button { background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎓 Internship Assignment Confirmation</h1>
    <p>M2 SIF Program</p>
  </div>
  <div class="content">
    <h2 style="color: #495057; margin-top: 0;">Dear ${safeStudentName},</h2>
    <p style="font-size: 16px;">We are pleased to inform you that you have been assigned to an internship for the M2 SIF program.</p>
    <div class="assignment-box">
      <h3 style="color: #495057; margin-top: 0;">📋 Assignment Details</h3>
      <p><strong>Internship Subject:</strong> ${safeSubjectTitle}</p>
      <p><strong>Supervisor:</strong> ${safeSupervisorName}</p>
    </div>
    <p style="font-size: 16px;">Please contact your supervisor to discuss the next steps and begin your internship.</p>
    <div style="text-align: center;">
      <a href="${siteUrl}/app" class="cta-button">Access Internship Platform</a>
    </div>
    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h4 style="margin-top: 0; color: #92400e;">📋 Next Steps:</h4>
      <ul style="color: #92400e;">
        <li>Log in to the internship platform to view detailed information</li>
        <li>Contact your supervisor to discuss the internship details</li>
        <li>Review any additional requirements or documentation</li>
      </ul>
    </div>
    <p style="font-size: 16px;">If you have any questions, please don't hesitate to contact your supervisor or the administration.</p>
    <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
    <p style="font-size: 12px; color: #6c757d; text-align: center; margin: 0;">Best regards,<br><strong>M2 SIF Administration Team</strong></p>
  </div>
</body>
</html>`

    // 4. Send through Resend.
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "M2 SIF <noreply@send.mathieuacher.com>",
        to: [studentEmail],
        reply_to: "mathieu.acher@inria.fr",
        subject: "🎓 Internship Assignment Confirmation - M2 SIF",
        html,
      }),
    })
    const resendJson = await resendResponse.json().catch(() => ({}))
    if (!resendResponse.ok) {
      console.error("Resend error", resendResponse.status, resendJson)
      return json({ success: false, error: resendJson?.message || "Failed to send email via Resend" }, 502)
    }

    console.log(`Assignment email sent to ${studentEmail} by admin ${user.id} (id ${resendJson?.id})`)
    return json({ success: true, emailId: resendJson?.id, message: "Email sent successfully via Resend" })
  } catch (error) {
    console.error("Unexpected error", error)
    return json({ success: false, error: error instanceof Error ? error.message : "Internal error" }, 500)
  }
})
