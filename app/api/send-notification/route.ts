import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { subjectId, status, adminComment } = await request.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    })

    // Get subject details
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("*")
      .eq("id", subjectId)
      .single()

    if (subjectError || !subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    // Prepare email content based on status
    let emailSubject = ""
    let emailBody = ""

    switch (status) {
      case "validated":
        emailSubject = `✅ Your internship subject "${subject.title}" has been validated`
        emailBody = `
Dear ${subject.main_supervisor_name},

Great news! Your internship subject has been validated and is now available for student selection.

Subject: ${subject.title}
Status: Validated ✅

Your subject is now visible to students in the internship browser. Students will be able to select it as one of their preferences.

Best regards,
The Internship Management Team
        `
        break

      case "needs_modification":
        emailSubject = `📝 Your internship subject "${subject.title}" needs modification`
        emailBody = `
Dear ${subject.main_supervisor_name},

Your internship subject requires some modifications before it can be validated.

Subject: ${subject.title}
Status: Needs Modification 📝

Admin feedback:
${adminComment || "No specific feedback provided."}

Please log in to your account to edit your subject and resubmit it for review.

Best regards,
The Internship Management Team
        `
        break

      case "refused":
        emailSubject = `❌ Your internship subject "${subject.title}" has been refused`
        emailBody = `
Dear ${subject.main_supervisor_name},

Unfortunately, your internship subject has been refused.

Subject: ${subject.title}
Status: Refused ❌

Admin feedback:
${adminComment || "No specific feedback provided."}

If you have questions about this decision, please contact the administration.

Best regards,
The Internship Management Team
        `
        break

      default:
        return NextResponse.json({ error: "Invalid status for notification" }, { status: 400 })
    }

    // In a real application, you would integrate with an email service like:
    // - Resend
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP

    // For now, we'll simulate sending the email
    console.log("📧 Email notification would be sent:")
    console.log("To:", subject.main_supervisor_email)
    console.log("Subject:", emailSubject)
    console.log("Body:", emailBody)

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      message: "Email notification sent successfully",
      emailPreview: {
        to: subject.main_supervisor_email,
        subject: emailSubject,
        body: emailBody,
      },
    })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
