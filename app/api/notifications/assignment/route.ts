import { NextResponse, type NextRequest } from "next/server"
import { getRouteUser, escapeHtml } from "@/lib/supabase/route-auth"

/**
 * Legacy notification route that relays to the Supabase Edge Function
 * `send-assignment-email`. The dashboard now uses /api/notifications/assignment-resend;
 * this route is kept for compatibility but is restricted to administrators.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRouteUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })

    const payload = await request.json()
    const { studentEmail, studentName, subjectTitle, supervisorName } = payload as Record<string, unknown>

    if (typeof studentEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      return NextResponse.json({ error: "Invalid student email" }, { status: 400 })
    }

    const safeStudentName = escapeHtml(studentName)
    const safeSubjectTitle = escapeHtml(subjectTitle)
    const safeSupervisorName = escapeHtml(supervisorName)
    const appUrl = `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/app`

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; text-align: center;">🎓 Internship Assignment Confirmation</h2>
        </div>
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>${safeStudentName}</strong>,</p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            We are pleased to inform you that you have been assigned to the following internship:
          </p>
          <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
            <h3 style="margin-top: 0; color: #1e40af; font-size: 20px;">${safeSubjectTitle}</h3>
            <p style="margin-bottom: 10px;"><strong>Supervisor:</strong> ${safeSupervisorName}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Access Internship Platform
            </a>
          </div>
          <p style="font-size: 16px; margin-bottom: 20px;">
            If you have any questions, please contact your supervisor or the administration.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Best regards,<br>
            <strong>M2 SIF Administration Team</strong>
          </p>
        </div>
      </div>
    `

    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-assignment-email`
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: studentEmail,
        subject: "🎓 Internship Assignment Confirmation - M2 SIF",
        html: emailHtml,
        student_name: studentName,
        subject_title: subjectTitle,
        supervisor_name: supervisorName,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Edge function error:", response.status, errorText)
      return NextResponse.json(
        { success: false, message: "Edge function unavailable", status: response.status },
        { status: 502 },
      )
    }

    const result = await response.json()
    return NextResponse.json({
      success: !!result.success,
      message: result.message || (result.success ? "Email sent" : "Email sending failed"),
      error: result.error,
    })
  } catch (e) {
    console.error("Error sending assignment notification:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 })
  }
}
