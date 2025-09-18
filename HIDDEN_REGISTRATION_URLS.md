# Hidden Registration URLs

This document contains the private URLs for administrator and observer registration. These URLs should only be shared with authorized personnel.

## Administrator Registration

**URL**: `/auth/admin-signup`

**Access**: Private - Only share with authorized administrators

**Features**:
- Creates administrator accounts with full system access
- Can review and validate internship subjects
- Can manage student assignments
- Can send assignment notification emails
- Can manage user accounts

**Usage**:
1. Navigate to: `https://yourdomain.com/auth/admin-signup`
2. Fill in the registration form
3. Account is created with administrator role
4. Redirected to admin dashboard

## Observer Registration

**URL**: `/auth/observer-signup`

**Access**: Private - Only share with authorized observers

**Features**:
- Creates observer accounts with read-only access
- Can view validated internship subjects
- Can view student assignments
- Cannot modify any data
- Perfect for external stakeholders who need visibility

**Usage**:
1. Navigate to: `https://yourdomain.com/auth/observer-signup`
2. Fill in the registration form
3. Account is created with observer role
4. Redirected to observer dashboard

## Security Notes

- These URLs are not linked from the main application
- Regular signup page only allows student and supervisor roles
- Administrator and observer roles cannot be selected in public registration
- URLs should be kept confidential and only shared with authorized personnel

## Role Permissions Summary

| Role | Can View Subjects | Can Validate Subjects | Can Manage Assignments | Can Send Emails | Can Manage Users |
|------|------------------|---------------------|----------------------|-----------------|------------------|
| Student | ✅ (validated only) | ❌ | ❌ | ❌ | ❌ |
| Supervisor | ✅ (own subjects) | ✅ (own subjects) | ❌ | ❌ | ❌ |
| Observer | ✅ (validated only) | ❌ | ❌ | ❌ | ❌ |
| Administrator | ✅ (all) | ✅ (all) | ✅ | ✅ | ✅ |

## Implementation Details

- Hidden URLs are implemented as separate Next.js pages
- Role is set during registration via Supabase auth metadata
- Role-based access control is enforced throughout the application
- Observer dashboard fetches data using admin API endpoints (with proper authentication)
