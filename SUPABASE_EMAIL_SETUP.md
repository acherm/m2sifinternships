# 📧 Supabase Email Setup Guide

## Current Status
- ✅ **Console Logging**: Working perfectly
- ❌ **Real Emails**: Need to configure Supabase SMTP

## 🚀 Configure Supabase SMTP (Recommended)

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Click on **"Settings"** in the left sidebar
3. Click on **"Auth"** tab
4. Scroll down to **"SMTP Settings"** section

### Step 2: Enable Custom SMTP
1. Toggle **"Enable Custom SMTP"** to ON
2. Fill in your SMTP server details:

```
SMTP Host: smtp.gmail.com (for Gmail)
SMTP Port: 587
SMTP Username: your-email@gmail.com
SMTP Password: your-app-password (not regular password)
Sender Email: your-email@gmail.com
Sender Name: M2 SIF Administration
```

### Step 3: Gmail Setup (Example)
If using Gmail:
1. Enable 2-factor authentication
2. Generate an "App Password":
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password (not your regular password)

### Step 4: Alternative SMTP Providers
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your organization's SMTP server

### Step 5: Test Configuration
1. Save the SMTP settings in Supabase
2. Try sending a test email from Supabase Auth settings
3. Check if emails are received

## 🔧 Update Code for Real Emails

After SMTP is configured, replace the console logging in `/app/api/notifications/assignment/route.ts`:

```typescript
// Replace the console logging section with:
const { data, error } = await service.auth.admin.inviteUserByEmail(studentEmail, {
  data: {
    student_name: studentName,
    subject_title: subjectTitle,
    supervisor_name: supervisorName,
    email_type: 'assignment_confirmation'
  }
})

if (error) {
  console.error("📧 Supabase email error:", error)
  return NextResponse.json({ error: `Failed to send email: ${error.message}` }, { status: 500 })
}

console.log("📧 Email sent successfully via Supabase:", data)
```

## 🎯 Alternative: Use Supabase Edge Functions

Create `/supabase/functions/send-email/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { to, subject, html } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Use Supabase's built-in email via auth
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(to)
  
  return new Response(JSON.stringify({ data, error }))
})
```

## 📋 Testing Steps

1. **Configure SMTP** in Supabase dashboard
2. **Test email** from Supabase Auth settings
3. **Update code** to use real email sending
4. **Test assignment email** in your app
5. **Check inbox** for received emails

## ⚠️ Important Notes

- **SMTP Configuration**: Must be done in Supabase dashboard
- **App Passwords**: Use app passwords for Gmail, not regular passwords
- **Rate Limits**: Supabase has email rate limits
- **Domain Verification**: May need to verify your domain for better deliverability

## 🎉 Result

Once configured, emails will be sent through Supabase's SMTP system, just like the magic link emails you already receive!
