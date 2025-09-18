# Domain Setup Guide for Resend

## Option 1: Free Domain (Recommended for Testing)

### Step 1: Get a Free Domain
1. Go to [Freenom](https://freenom.com) or [No-IP](https://noip.com)
2. Register a free domain like `m2sif-test.tk` or `m2sif-test.ml`
3. Note down the domain name

### Step 2: Configure DNS in Resend
1. Go to [resend.com/domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your free domain (e.g., `m2sif-test.tk`)
4. Follow the DNS configuration instructions

### Step 3: Update DNS Records
You'll need to add these DNS records to your domain:
- **TXT Record**: For domain verification
- **MX Record**: For email routing
- **CNAME Record**: For email authentication

### Step 4: Update Code
Once verified, update the API route to use your domain.

## Option 2: Use Your Existing Domain

If you have an existing domain:

### Step 1: Add Domain to Resend
1. Go to [resend.com/domains](https://resend.com/domains)
2. Add your domain (e.g., `yourdomain.com`)

### Step 2: Configure DNS
Add the required DNS records:
- **TXT Record**: `resend._domainkey.yourdomain.com`
- **MX Record**: `feedback-smtp.us-east-1.amazonses.com`
- **CNAME Record**: `resend.yourdomain.com`

### Step 3: Verify Domain
Click "Verify" in Resend dashboard

## Option 3: Use a Subdomain

If you have a main domain, create a subdomain:
- `email.yourdomain.com`
- `noreply.yourdomain.com`
- `m2sif.yourdomain.com`

## DNS Configuration Example

For domain `m2sif-test.tk`, you would add:

```
Type: TXT
Name: resend._domainkey
Value: [Resend will provide this]

Type: MX
Name: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10

Type: CNAME
Name: resend
Value: [Resend will provide this]
```

## After Domain Setup

Once your domain is verified, update the API route:

```typescript
from: 'M2 SIF <noreply@yourdomain.com>'
```

## Testing

After setup, test with any email address:
```bash
curl -X POST http://localhost:3000/api/notifications/assignment-resend \
  -H "Content-Type: application/json" \
  -d '{"studentEmail":"any@email.com","studentName":"Test","subjectTitle":"Test","supervisorName":"Test"}'
```

## Cost

- **Free domains**: $0/year
- **Resend**: Free tier (3,000 emails/month)
- **Total cost**: $0 for testing and small production use

## Benefits

✅ Send to any email address
✅ Professional sender address
✅ Better deliverability
✅ No "onboarding@resend.dev" limitations
✅ Custom branding
