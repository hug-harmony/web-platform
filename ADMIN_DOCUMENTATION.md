# Hug Harmony - Admin Side Documentation

## Table of Contents
1. [Overview](#overview)
2. [Admin Dashboard](#admin-dashboard)
3. [User Management](#user-management)
4. [Professional Management](#professional-management)
5. [Booking & Payment Management](#booking--payment-management)
6. [Content Management](#content-management)
7. [Reporting & Moderation](#reporting--moderation)
8. [System Settings](#system-settings)
9. [Analytics & Statistics](#analytics--statistics)
10. [API Routes](#api-routes)

---

## Overview

The Hug Harmony admin panel provides comprehensive tools for managing the platform, including user management, professional applications, bookings, payments, content moderation, and system configuration.

**Admin Access**: Users with `isAdmin: true` flag in the database can access admin features.

**Base Route**: `/admin/dashboard`

---

## Admin Dashboard

### Main Dashboard (`/admin/dashboard/page.tsx`)

The central hub for admin operations with quick access to all management modules.

**Key Features**:
- Overview statistics and metrics
- Quick links to all admin modules
- Recent activity monitoring
- System health indicators

**Components**:
- Dashboard layout with navigation
- Statistics cards
- Activity feed
- Quick action buttons

---

## User Management

### 1. User Overview (`/admin/dashboard/users`)

**Purpose**: Manage all platform users (clients)

**Features**:
- View all registered users
- Search and filter users
- User status management (active/suspended)
- View user details and activity
- Access user profiles

**API Endpoints**:
- `GET /api/admin/users` - Fetch all users with pagination
- `GET /api/admin/users/[id]` - Get specific user details
- `PATCH /api/admin/users/[id]` - Update user status
- `DELETE /api/admin/users/[id]` - Delete user account

**Database Models**:
- `User` - Main user model with profile information
- `SecurityLog` - Track user security events
- `Block` - User blocking relationships

### 2. User Details

**Information Displayed**:
- Personal information (name, email, phone)
- Profile details (biography, location, preferences)
- Account status and verification
- Login history and security logs
- Appointment history
- Payment history
- Reports filed/received

**Actions Available**:
- Suspend/activate account
- Reset password
- Verify email manually
- View/edit profile
- View user's appointments
- View user's messages

---

## Professional Management

### 1. Professional Applications (`/admin/dashboard/professional-applications`)

**Purpose**: Review and approve professional applications

**Application Workflow**:
1. **FORM_PENDING** - User hasn't submitted application
2. **FORM_SUBMITTED** - Application submitted, awaiting video
3. **VIDEO_PENDING** - Form approved, video not watched
4. **QUIZ_PENDING** - Video watched, quiz not attempted
5. **QUIZ_PASSED** - Quiz passed, awaiting admin review
6. **QUIZ_FAILED** - Quiz failed, can retry
7. **ADMIN_REVIEW** - Under admin review
8. **APPROVED** - Application approved, professional account created
9. **REJECTED** - Application rejected
10. **SUSPENDED** - Professional account suspended

**Features**:
- View all applications with status filters
- Review application details
- Watch training video completion status
- Review quiz results
- Approve/reject applications
- Set professional rates and venue types

**API Endpoints**:
- `GET /api/admin/professional-applications` - List all applications
- `GET /api/admin/professional-applications/[id]` - Get application details
- `PATCH /api/admin/professional-applications/[id]` - Update application status
- `POST /api/admin/professional-applications/[id]/approve` - Approve application
- `POST /api/admin/professional-applications/[id]/reject` - Reject application

**Database Models**:
- `ProfessionalApplication` - Application data
- `ProQuizAttempt` - Quiz attempt records
- `TrainingVideoWatch` - Video watch progress

### 2. Professional Management (`/admin/dashboard/professionals`)

**Purpose**: Manage active professionals

**Features**:
- View all professionals
- Search and filter professionals
- Edit professional profiles
- Manage professional rates
- Set company cut percentage
- Suspend/activate professional accounts
- View professional earnings
- Manage payment methods

**Professional Information**:
- Name, image, biography
- Rating and review count
- Hourly rate
- Venue type (host/visit/both)
- Company cut percentage
- Payment acceptance methods
- Stripe payment information
- Payment method status

**API Endpoints**:
- `GET /api/admin/professionals` - List all professionals
- `GET /api/admin/professionals/[id]` - Get professional details
- `PATCH /api/admin/professionals/[id]` - Update professional info
- `DELETE /api/admin/professionals/[id]` - Delete professional account

**Database Models**:
- `Professional` - Professional profile and settings
- `Availability` - Professional availability schedule
- `Discount` - Professional discount offerings

---

## Booking & Payment Management

### 1. Bookings & Payments (`/admin/dashboard/bookings-payments`)

**Purpose**: Monitor and manage all appointments and payments

**Features**:
- View all appointments
- Filter by status (upcoming/completed/cancelled)
- View appointment details
- Manage appointment disputes
- View payment information
- Process refunds
- Adjust appointment rates

**Appointment Statuses**:
- `upcoming` - Scheduled appointment
- `completed` - Session completed
- `cancelled` - Appointment cancelled
- `disputed` - Under dispute

**Dispute Management**:
- View dispute reason
- Add admin notes
- Resolve disputes
- Process refunds if necessary

**API Endpoints**:
- `GET /api/admin/appointments` - List all appointments
- `GET /api/admin/appointments/[id]` - Get appointment details
- `PATCH /api/admin/appointments/[id]` - Update appointment
- `POST /api/admin/disputes/resolve` - Resolve dispute

**Database Models**:
- `Appointment` - Appointment details
- `Payment` - Payment records
- `AppointmentConfirmation` - Confirmation tracking

### 2. Payment Processing (`/admin/dashboard/payments`)

**Purpose**: Manage payment cycles and fee collection

**Features**:
- View payout cycles
- Monitor fee charges
- Track earnings
- Process failed payments
- Waive fees
- View payment history

**Payment Cycle Workflow**:
1. **Active** - Current cycle collecting earnings
2. **Confirming** - Waiting for confirmations
3. **Processing** - Collecting fees
4. **Completed** - Cycle completed
5. **Failed** - Processing failed

**API Endpoints**:
- `GET /api/admin/payments/cycles` - List payout cycles
- `GET /api/admin/payments/earnings` - View earnings
- `GET /api/admin/payments/fee-charges` - View fee charges
- `POST /api/admin/payments/waive-fee` - Waive fee charge
- `POST /api/admin/payments/retry-charge` - Retry failed charge

**Database Models**:
- `PayoutCycle` - Bi-monthly payout cycles
- `Earning` - Professional earnings per session
- `FeeCharge` - Platform fee charges

### 3. Dispute Handling (`/admin/dashboard/dispute-handling`)

**Purpose**: Manage appointment disputes and confirmations

**Features**:
- View disputed appointments
- Review confirmation status
- Client confirmation tracking
- Professional confirmation tracking
- Auto-resolution monitoring
- Manual dispute resolution

**Confirmation Statuses**:
- `pending` - Awaiting confirmations
- `confirmed` - Both parties confirmed
- `not_occurred` - Marked as not occurred
- `disputed` - Under dispute
- `auto_not_occurred` - Auto-resolved as not occurred

**API Endpoints**:
- `GET /api/admin/disputes` - List all disputes
- `PATCH /api/admin/disputes/[id]` - Update dispute status

---

## Content Management

### 1. Training Videos (`/admin/dashboard/training-videos`)

**Purpose**: Manage training videos for professional onboarding

**Features**:
- Upload new training videos
- Edit video details (name, URL, duration)
- Mark videos as pro onboarding videos
- Activate/deactivate videos
- Track video watch statistics
- View completion rates

**API Endpoints**:
- `GET /api/admin/trainingvideos` - List all videos
- `POST /api/admin/trainingvideos` - Create new video
- `PATCH /api/admin/trainingvideos/[id]` - Update video
- `DELETE /api/admin/trainingvideos/[id]` - Delete video
- `GET /api/admin/trainingvideos/stats` - Get watch statistics

**Database Models**:
- `TrainingVideo` - Video metadata
- `TrainingVideoWatch` - Watch progress tracking

### 2. Merchandise Management (`/admin/dashboard/merchandise`)

**Purpose**: Manage platform merchandise

**Features**:
- Add new merchandise items
- Edit product details
- Update pricing
- Manage stock levels
- Upload product images
- Activate/deactivate products
- View sales statistics

**API Endpoints**:
- `GET /api/admin/merchandise` - List all products
- `POST /api/admin/merchandise` - Create product
- `PATCH /api/admin/merchandise/[id]` - Update product
- `DELETE /api/admin/merchandise/[id]` - Delete product
- `GET /api/admin/merchandise/stats` - Sales statistics

**Database Models**:
- `Merchandise` - Product information
- `Order` - Customer orders
- `OrderItem` - Order line items

### 3. Forum Management

**Purpose**: Moderate forum posts and replies

**Features**:
- View all forum posts
- Filter by category
- Delete inappropriate posts
- Manage replies
- Ban users from forum

**API Endpoints**:
- `GET /api/posts` - List posts
- `DELETE /api/posts/[id]` - Delete post
- `DELETE /api/posts/[id]/replies/[replyId]` - Delete reply

**Database Models**:
- `Post` - Forum posts
- `Reply` - Post replies

---

## Reporting & Moderation

### 1. Reports Management (`/admin/dashboard/reports`)

**Purpose**: Review and respond to user reports

**Report Types**:
- User reports
- Professional reports
- Content reports

**Report Priorities**:
- `low` - Minor issues
- `normal` - Standard reports
- `high` - Serious violations
- `urgent` - Critical issues requiring immediate action

**Report Statuses**:
- `pending` - New report, not reviewed
- `reviewing` - Under review
- `resolved` - Report resolved
- `dismissed` - Report dismissed

**Features**:
- View all reports with filters
- Sort by priority/date
- Review report details
- Add admin response
- Update report status
- Take action on reported users/professionals
- Track resolution time

**API Endpoints**:
- `GET /api/admin/reports` - List all reports
- `GET /api/admin/reports/[id]` - Get report details
- `PATCH /api/admin/reports/[id]` - Update report status
- `POST /api/admin/reports/[id]/respond` - Add admin response

**Database Models**:
- `Report` - Report details and status
- User relation for reporter
- User/Professional relation for reported entity

### 2. Feedback Management

**Purpose**: Review and respond to user feedback

**Features**:
- View all feedback submissions
- Filter by rating
- Add admin responses
- Track feedback trends
- Export feedback data

**API Endpoints**:
- `GET /api/admin/feedback` - List all feedback
- `POST /api/admin/feedback/[id]/respond` - Respond to feedback

**Database Models**:
- `Feedback` - User feedback submissions

---

## System Settings

### Settings Management (`/admin/dashboard/settings`)

**Purpose**: Configure system-wide settings

**Configurable Settings**:
- **Company Cut Percentage**: Default platform fee percentage
- **Payment Processing**: Stripe configuration
- **Email Settings**: SMTP configuration
- **Notification Settings**: Push notification configuration
- **Rate Limits**: API rate limiting
- **Feature Flags**: Enable/disable features

**API Endpoints**:
- `GET /api/admin/settings` - Get all settings
- `PATCH /api/admin/settings` - Update settings

**Database Models**:
- `CompanySettings` - Key-value configuration store

---

## Analytics & Statistics

### Statistics Dashboard (`/admin/dashboard/stats`)

**Purpose**: View platform analytics and metrics

**Metrics Tracked**:
- **User Metrics**:
  - Total users
  - New registrations (daily/weekly/monthly)
  - Active users
  - User retention rate

- **Professional Metrics**:
  - Total professionals
  - Active professionals
  - Application approval rate
  - Average rating

- **Booking Metrics**:
  - Total appointments
  - Completed appointments
  - Cancellation rate
  - Average session duration

- **Revenue Metrics**:
  - Total revenue
  - Platform fees collected
  - Average transaction value
  - Revenue trends

- **Engagement Metrics**:
  - Messages sent
  - Forum posts
  - Profile visits
  - Video sessions

**API Endpoints**:
- `GET /api/admin/stats/users` - User statistics
- `GET /api/admin/stats/professionals` - Professional statistics
- `GET /api/admin/stats/bookings` - Booking statistics
- `GET /api/admin/stats/revenue` - Revenue statistics

---

## API Routes

### Admin API Structure

All admin API routes are protected and require admin authentication.

**Base Path**: `/api/admin/`

### Authentication & Authorization

**Middleware**: `src/middleware.ts`
- Checks for valid session
- Verifies `isAdmin` flag
- Redirects unauthorized users

**Auth Check**: `GET /api/auth/check-admin`
- Returns admin status of current user

### Admin API Endpoints Summary

#### User Management
- `GET /api/admin/users` - List users
- `GET /api/admin/users/[id]` - User details
- `PATCH /api/admin/users/[id]` - Update user
- `DELETE /api/admin/users/[id]` - Delete user
- `GET /api/admin/users/[id]/security-logs` - Security logs

#### Professional Management
- `GET /api/admin/professionals` - List professionals
- `GET /api/admin/professionals/[id]` - Professional details
- `PATCH /api/admin/professionals/[id]` - Update professional
- `DELETE /api/admin/professionals/[id]` - Delete professional
- `GET /api/admin/professional-applications` - List applications
- `PATCH /api/admin/professional-applications/[id]` - Update application
- `POST /api/admin/professional-applications/[id]/approve` - Approve
- `POST /api/admin/professional-applications/[id]/reject` - Reject

#### Booking & Payment Management
- `GET /api/admin/appointments` - List appointments
- `GET /api/admin/appointments/[id]` - Appointment details
- `PATCH /api/admin/appointments/[id]` - Update appointment
- `GET /api/admin/payments/cycles` - Payout cycles
- `GET /api/admin/payments/earnings` - Earnings
- `GET /api/admin/payments/fee-charges` - Fee charges
- `POST /api/admin/payments/waive-fee` - Waive fee
- `POST /api/admin/disputes/resolve` - Resolve dispute

#### Content Management
- `GET /api/admin/trainingvideos` - List videos
- `POST /api/admin/trainingvideos` - Create video
- `PATCH /api/admin/trainingvideos/[id]` - Update video
- `DELETE /api/admin/trainingvideos/[id]` - Delete video
- `GET /api/admin/merchandise` - List products
- `POST /api/admin/merchandise` - Create product
- `PATCH /api/admin/merchandise/[id]` - Update product
- `DELETE /api/admin/merchandise/[id]` - Delete product

#### Reporting & Moderation
- `GET /api/admin/reports` - List reports
- `GET /api/admin/reports/[id]` - Report details
- `PATCH /api/admin/reports/[id]` - Update report
- `POST /api/admin/reports/[id]/respond` - Respond to report
- `GET /api/admin/feedback` - List feedback
- `POST /api/admin/feedback/[id]/respond` - Respond to feedback

#### System Settings
- `GET /api/admin/settings` - Get settings
- `PATCH /api/admin/settings` - Update settings

#### Analytics
- `GET /api/admin/stats/users` - User stats
- `GET /api/admin/stats/professionals` - Professional stats
- `GET /api/admin/stats/bookings` - Booking stats
- `GET /api/admin/stats/revenue` - Revenue stats

#### Messaging & Operations
- `GET /api/admin/messaging` - View all conversations
- `GET /api/admin/operations` - System operations

---

## Database Schema (Admin-Related Models)

### Key Models for Admin Operations

**User**
- Admin flag: `isAdmin: Boolean`
- Status management: `status: String`
- Security tracking: `SecurityLog[]`

**Professional**
- Company cut: `companyCutPercentage: Float`
- Payment methods: Stripe integration
- Status flags: `hasValidPaymentMethod`, `paymentBlockedAt`

**ProfessionalApplication**
- Status tracking: `ProOnboardingStatus` enum
- Quiz attempts: `ProQuizAttempt[]`
- Video watch: `TrainingVideoWatch`

**Report**
- Priority levels: `low`, `normal`, `high`, `urgent`
- Admin response: `adminResponse`, `adminRespondedBy`, `adminRespondedAt`
- Status: `pending`, `reviewing`, `resolved`, `dismissed`

**PayoutCycle**
- Bi-monthly cycles (1st-15th, 16th-end)
- Status: `active`, `confirming`, `processing`, `completed`, `failed`
- Auto-confirmation tracking

**Earning**
- Per-session earnings
- Platform fee calculation
- Status: `pending`, `confirmed`, `not_occurred`, `disputed`, `charged`, `waived`

**FeeCharge**
- Aggregated fees per professional per cycle
- Stripe payment tracking
- Retry mechanism for failed charges

---

## Security & Permissions

### Admin Access Control

**Authentication**: NextAuth.js with Prisma adapter
**Authorization**: Role-based (isAdmin flag)

### Protected Routes

All `/admin/*` routes are protected by middleware:
- Checks authentication
- Verifies admin status
- Redirects non-admin users to dashboard

### Audit Logging

**SecurityLog Model** tracks:
- Login attempts
- Password changes
- Admin actions
- Suspicious activity

---

## Best Practices for Admin Operations

1. **Always verify before deletion** - User and professional deletions are permanent
2. **Document admin actions** - Use admin notes fields for important decisions
3. **Monitor payment cycles** - Ensure timely processing of payouts and fees
4. **Review reports promptly** - Prioritize high and urgent reports
5. **Regular data backups** - Ensure database backups are current
6. **Track application status** - Follow up on applications in ADMIN_REVIEW status
7. **Monitor system health** - Check for failed payments, disputes, and errors

---

## Support & Troubleshooting

### Common Admin Tasks

**Approving a Professional Application**:
1. Navigate to Professional Applications
2. Review application details
3. Check video completion and quiz score
4. Set rate and company cut percentage
5. Approve or reject with reason

**Resolving a Dispute**:
1. Navigate to Dispute Handling
2. Review appointment details
3. Check both parties' confirmations
4. Add admin notes
5. Update dispute status
6. Process refund if necessary

**Managing Failed Payments**:
1. Navigate to Payments
2. Filter by failed status
3. Review failure reason
4. Update payment method or waive fee
5. Retry charge or mark as resolved

---

## Technical Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **Cloud Services**: AWS (S3, Lambda, SNS, SQS)
- **Real-time**: WebSocket (AWS API Gateway)
- **UI Components**: Radix UI, shadcn/ui

---

*Last Updated: January 2026*
