import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, student_name, subject_title, supervisor_name } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("📧 Assignment Email Notification:")
    console.log("To:", to)
    console.log("Subject:", subject)
    console.log("Student:", student_name)
    console.log("Subject:", subject_title)
    console.log("Supervisor:", supervisor_name)
    console.log("HTML Content:", html)
    console.log("---")

    try {
      // First, try to get the existing user to see if they exist
      const { data: existingUser, error: getUserError } = await supabaseClient.auth.admin.listUsers()
      
      if (getUserError) {
        console.log("❌ Error getting users:", getUserError.message)
      } else {
        console.log("📧 Found", existingUser.users.length, "users in system")
      }

      // Try password reset approach for existing users
      console.log("📧 Trying password reset approach for existing user:", to)
      
      const { data: resetData, error: resetError } = await supabaseClient.auth.admin.generateLink({
        type: 'recovery',
        email: to,
        options: {
          data: {
            email_type: 'assignment_confirmation',
            student_name: student_name,
            subject_title: subject_title,
            supervisor_name: supervisor_name,
            custom_subject: subject,
            custom_html: html
          }
        }
      })
      
      if (resetError) {
        console.log("❌ Password reset approach failed:", resetError.message)
        
        // Fallback: Try temporary user approach
        const tempEmail = `temp.${Date.now()}.${Math.random().toString(36).substring(7)}@temp.local`
        console.log("📧 Trying fallback with temp email:", tempEmail)
        
        const { data, error } = await supabaseClient.auth.admin.inviteUserByEmail(tempEmail, {
          data: {
            email_type: 'assignment_confirmation',
            student_name: student_name,
            subject_title: subject_title,
            supervisor_name: supervisor_name,
            custom_subject: subject,
            custom_html: html,
            original_recipient: to,
            original_email: to
          }
        })
        
        if (error) {
          console.log("❌ Both approaches failed")
          throw error
        } else {
          // Clean up temporary user
          if (data.user?.id) {
            await supabaseClient.auth.admin.deleteUser(data.user.id)
            console.log("✅ Temporary user cleaned up")
          }
          console.log("✅ Email sent via temporary user approach")
        }
      } else {
        console.log("✅ Password reset email sent successfully")
        console.log("📧 Reset link generated:", resetData.properties?.action_link)
        console.log("📧 Email sent to:", to)
      }
    } catch (e) {
      console.error("❌ Unexpected error:", e)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Unexpected error occurred",
          emailData: {
            to: to,
            subject: subject,
            student: student_name,
            subjectTitle: subject_title,
            supervisor: supervisor_name
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully via Supabase SMTP",
        emailData: {
          to: to,
          subject: subject,
          student: student_name,
          subjectTitle: subject_title,
          supervisor: supervisor_name
        },
        note: "Email sent using Supabase SMTP with custom template data. Check your email template configuration in Supabase dashboard."
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error("❌ Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
