import { NextResponse, type NextRequest } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  console.log("📧 Assignment notification API called (Resend)")
  try {
    const payload = await request.json()
    console.log("📧 Received payload:", payload)
    const { studentEmail, studentName, subjectTitle, supervisorName } = payload

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 })
    }

    // Create beautiful HTML email template
    const emailHtml = `
      <!DOCTYPE html>
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
          .footer { color: #6c757d; font-size: 12px; text-align: center; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎓 Internship Assignment Confirmation</h1>
          <p>M2 SIF Program</p>
        </div>
        
        <div class="content">
          <h2 style="color: #495057; margin-top: 0;">Dear ${studentName},</h2>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            We are pleased to inform you that you have been assigned to an internship for the M2 SIF program.
          </p>
          
          <div class="assignment-box">
            <h3 style="color: #495057; margin-top: 0;">📋 Assignment Details</h3>
            <p><strong>Internship Subject:</strong> ${subjectTitle}</p>
            <p><strong>Supervisor:</strong> ${supervisorName}</p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Please contact your supervisor to discuss the next steps and begin your internship.
          </p>
          
          <div style="text-align: center;">
            <a href="${request.nextUrl.origin}/app" class="cta-button">
              Access Internship Platform
            </a>
          </div>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="margin-top: 0; color: #92400e;">📋 Next Steps:</h4>
            <ul style="color: #92400e;">
              <li>Log in to the internship platform to view detailed information</li>
              <li>Contact your supervisor to discuss the internship details</li>
              <li>Review any additional requirements or documentation</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            If you have any questions, please don't hesitate to contact your supervisor or the administration.
          </p>
          
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6c757d; text-align: center; margin: 0;">
            Best regards,<br>
            <strong>M2 SIF Administration Team</strong>
          </p>
        </div>
      </body>
      </html>
    `

    // Send email using Resend
    console.log("📧 Sending email via Resend...")
    console.log("To:", studentEmail)
    console.log("Subject: 🎓 Internship Assignment Confirmation - M2 SIF")
    
    const { data, error } = await resend.emails.send({
      from: 'M2 SIF <noreply@send.mathieuacher.com>', // Using your verified domain
      to: [studentEmail],
      subject: '🎓 Internship Assignment Confirmation - M2 SIF',
      html: emailHtml,
      replyTo: 'mathieu.acher@inria.fr', // Your email for replies
    })

    if (error) {
      console.error("❌ Resend error:", error)
      return NextResponse.json({ 
        success: false,
        error: error.message,
        message: "Failed to send email via Resend"
      }, { status: 500 })
    }

    console.log("✅ Email sent successfully via Resend:", data)
    
    const successResponse = { 
      success: true, 
      message: "Email sent successfully via Resend",
      emailId: data.id,
      emailData: {
        to: studentEmail,
        subject: "🎓 Internship Assignment Confirmation - M2 SIF",
        student: studentName,
        subjectTitle,
        supervisor: supervisorName
      }
    }
    
    console.log("📧 Returning response:", successResponse)
    return NextResponse.json(successResponse)

  } catch (e: any) {
    console.error("Error sending assignment notification:", e)
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 })
  }
}
