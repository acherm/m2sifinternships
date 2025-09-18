# 🚀 Supabase Edge Function Setup for Email

## Current Status
- ✅ **API Updated**: Now tries to use Edge Function first
- ✅ **Edge Function Created**: `/supabase/functions/send-assignment-email/index.ts`
- 📋 **Deployment Needed**: Deploy the Edge Function to Supabase

## 🔧 Deploy Edge Function

### Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy send-assignment-email
   ```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **"Edge Functions"** in the left sidebar
3. Click **"Create a new function"**
4. Name it: `send-assignment-email`
5. Copy the code from `/supabase/functions/send-assignment-email/index.ts`
6. Deploy the function

## 🧪 Test the Setup

After deployment:

1. **Test the API**:
   ```bash
   curl -X POST http://localhost:3000/api/notifications/assignment \
     -H "Content-Type: application/json" \
     -d '{"studentEmail":"your-email@example.com","studentName":"Test Student","subjectTitle":"Test Internship","supervisorName":"Test Supervisor"}'
   ```

2. **Check server console** for:
   ```
   📧 Sending email via Supabase SMTP...
   📧 Email sent successfully via Edge Function: {...}
   ```

3. **Check your email inbox** for the assignment notification!

## 🔍 How It Works

1. **API Call**: Your app calls `/api/notifications/assignment`
2. **Edge Function**: API tries to call Supabase Edge Function `/functions/v1/send-email`
3. **Supabase SMTP**: Edge Function uses `auth.admin.inviteUserByEmail()` which uses your configured SMTP
4. **Email Sent**: Email is sent through your SMTP configuration
5. **Cleanup**: Temporary user is deleted after email is sent

## ⚠️ Important Notes

- **SMTP Configuration**: Must be configured in Supabase dashboard first
- **Edge Function**: Must be deployed to work
- **Fallback**: If Edge Function fails, it falls back to console logging
- **Rate Limits**: Supabase has email rate limits

## 🎉 Result

Once deployed, emails will be sent through your configured SMTP server using Supabase's infrastructure!
