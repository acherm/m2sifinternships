# Resend Email Setup Guide

This guide will help you set up Resend for sending assignment notification emails.

## Why Resend?

- ✅ **Designed for transactional emails** (like assignment notifications)
- ✅ **Works with any email address** (existing or new users)
- ✅ **Professional email templates** with full customization
- ✅ **High deliverability** and reliable delivery
- ✅ **Easy integration** with Next.js
- ✅ **Free tier available** (3,000 emails/month)

## Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

## Step 2: Get API Key

1. In your Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Give it a name like "M2 SIF Assignment Emails"
4. Copy the API key (starts with `re_`)

## Step 3: Configure Environment Variables

Add your Resend API key to your `.env.local` file:

```bash
RESEND_API_KEY=re_your_api_key_here
```

## Step 4: Configure Sending Domain (Optional but Recommended)

### Option A: Use Resend's Default Domain (Quick Setup)
The system will work with Resend's default domain for testing.

### Option B: Add Your Own Domain (Production Setup)
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Add your domain (e.g., `m2sif.university`)
4. Follow DNS configuration instructions
5. Update the `from` field in the API route

## Step 5: Test the System

1. Start your development server: `npm run dev`
2. Go to the admin dashboard
3. Assign a student to an internship
4. Click "Send Email" button
5. Check the student's email inbox

## Step 6: Monitor Email Delivery

1. Go to Resend dashboard → **Emails**
2. See all sent emails with delivery status
3. Check for any bounces or delivery issues

## Troubleshooting

### "Resend API key not configured"
- Make sure `RESEND_API_KEY` is in your `.env.local` file
- Restart your development server after adding the environment variable

### "Invalid API key"
- Check that your API key is correct
- Make sure there are no extra spaces or characters

### Emails not delivered
- Check the Resend dashboard for delivery status
- Verify the recipient email address is valid
- Check spam/junk folders

## Cost

- **Free tier**: 3,000 emails/month
- **Paid plans**: Start at $20/month for 50,000 emails
- Perfect for educational institutions

## Benefits Over Supabase Email

- ✅ **Purpose-built** for transactional emails
- ✅ **Works with existing users** (no authentication hacks)
- ✅ **Professional templates** with full HTML/CSS support
- ✅ **Delivery tracking** and analytics
- ✅ **No domain conflicts** with authentication emails
- ✅ **Better deliverability** rates

## Next Steps

Once set up, your assignment notification system will:
1. Send beautiful, professional emails
2. Work with any user (new or existing)
3. Provide delivery tracking
4. Scale easily as your institution grows

The system is now completely independent of Supabase's authentication email system!
