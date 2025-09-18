import { NextResponse, type NextRequest } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  console.log("📧 Assignment notification API called")
  try {
    const payload = await request.json()
    console.log("📧 Received payload:", payload)
    const { studentEmail, studentName, subjectTitle, supervisorName } = payload

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })

    const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    // Use Supabase's built-in email system via Edge Functions
    // This leverages the same email infrastructure used for magic links and signup
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; text-align: center;">🎓 Internship Assignment Confirmation</h2>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>${studentName}</strong>,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            We are pleased to inform you that you have been assigned to the following internship:
          </p>
          
          <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
            <h3 style="margin-top: 0; color: #1e40af; font-size: 20px;">${subjectTitle}</h3>
            <p style="margin-bottom: 10px;"><strong>Supervisor:</strong> ${supervisorName}</p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="margin-top: 0; color: #92400e;">📋 Next Steps:</h4>
            <ul style="color: #92400e;">
              <li>Log in to the internship platform to view detailed information</li>
              <li>Contact your supervisor to discuss the internship details</li>
              <li>Review any additional requirements or documentation</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${request.nextUrl.origin}/app" 
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

    // Use Supabase's configured SMTP to send email via Edge Function
    console.log("📧 Sending email via Supabase SMTP...")
    console.log("To:", studentEmail)
    console.log("Subject: 🎓 Internship Assignment Confirmation - M2 SIF")
    
    // Try to use Supabase Edge Function for email sending
    try {
      const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-assignment-email`
      console.log("📧 Calling Edge Function:", edgeFunctionUrl)
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
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

      console.log("📧 Edge Function response status:", response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log("📧 Edge Function response:", result)
        
        // Check if the Edge Function actually succeeded
        if (result.success) {
          const successResponse = { 
            success: true, 
            message: "Email sent successfully via Supabase SMTP",
            emailData: {
              to: studentEmail,
              subject: "🎓 Internship Assignment Confirmation - M2 SIF",
              student: studentName,
              subjectTitle,
              supervisor: supervisorName
            }
          }
          
          console.log("📧 Returning success response:", successResponse)
          return NextResponse.json(successResponse)
        } else {
          // Edge Function failed (e.g., user already exists)
          console.log("📧 Edge Function failed:", result.message)
          
          const errorResponse = { 
            success: false, 
            message: result.message || "Email sending failed",
            error: result.error || "Unknown error",
            emailData: {
              to: studentEmail,
              subject: "🎓 Internship Assignment Confirmation - M2 SIF",
              student: studentName,
              subjectTitle,
              supervisor: supervisorName
            },
            note: result.note || "Check Edge Function logs for details"
          }
          
          console.log("📧 Returning error response:", errorResponse)
          return NextResponse.json(errorResponse)
        }
      } else {
        const errorText = await response.text()
        console.warn("Edge function not available, falling back to console logging. Status:", response.status, "Error:", errorText)
      }
    } catch (edgeError) {
      console.warn("Edge function error, falling back to console logging:", edgeError)
    }
    
    // Fallback: Log the email to console (development mode)
    console.log("📧 Assignment Email Notification:")
    console.log("To:", studentEmail)
    console.log("Subject: 🎓 Internship Assignment Confirmation - M2 SIF")
    console.log("Student:", studentName)
    console.log("Subject:", subjectTitle)
    console.log("Supervisor:", supervisorName)
    console.log("---")
    
    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const response = { 
      success: true, 
      message: "Email logged to console (Edge Function not available)",
      emailData: {
        to: studentEmail,
        subject: "🎓 Internship Assignment Confirmation - M2 SIF",
        student: studentName,
        subjectTitle,
        supervisor: supervisorName
      }
    }
    
    console.log("📧 Returning response:", response)
    return NextResponse.json(response)

  } catch (e: any) {
    console.error("Error sending assignment notification:", e)
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 })
  }
}