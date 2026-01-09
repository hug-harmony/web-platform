# Hug Harmony - Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Routes](#api-routes)
5. [Infrastructure](#infrastructure)
6. [Shared Libraries](#shared-libraries)
7. [Components](#components)
8. [Hooks](#hooks)
9. [Utilities](#utilities)
10. [Security](#security)
11. [Deployment](#deployment)

---

## Project Overview

**Project Name**: Hug Harmony

**Description**: A platform connecting users with professional cuddlers and companions, featuring appointment booking, real-time messaging, video sessions, payment processing, and community features.

**Tech Stack**:
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **Cloud**: AWS (S3, Lambda, API Gateway, SNS, SQS, Chime)
- **Storage**: AWS S3, Supabase Storage
- **Video**: Amazon Chime SDK
- **Styling**: Tailwind CSS, Radix UI, shadcn/ui
- **State**: Zustand, SWR
- **Forms**: React Hook Form, Zod

**Repository Structure**:
```
hug-harmony/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin dashboard
│   │   ├── dashboard/         # User dashboard
│   │   ├── api/               # API routes
│   │   └── auth/              # Authentication pages
│   ├── components/            # React components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Shared libraries
│   ├── infrastructure/        # AWS CDK infrastructure
│   ├── lambda/                # Lambda functions
│   └── types/                 # TypeScript types
├── prisma/
│   └── schema.prisma          # Database schema
├── public/                    # Static assets
└── scripts/                   # Build/deployment scripts
```

---

## Architecture

### Application Architecture

**Pattern**: Monolithic Next.js application with serverless functions

**Layers**:
1. **Presentation Layer**: React components, pages
2. **API Layer**: Next.js API routes
3. **Business Logic Layer**: Services in `src/lib/services/`
4. **Data Access Layer**: Prisma ORM
5. **Infrastructure Layer**: AWS services

### Data Flow

```
User → Next.js Page → API Route → Service → Prisma → MongoDB
                                      ↓
                                  AWS Services (S3, SNS, etc.)
```

### Real-time Architecture

```
Client → WebSocket (API Gateway) → Lambda → DynamoDB (connections)
                                      ↓
                                  Broadcast to clients
```

### Video Session Architecture

```
Client → API → Chime SDK → Create Meeting
                              ↓
                         Join Meeting → Video Session
```

---

## Database Schema

### Database: MongoDB

**ORM**: Prisma

**Schema File**: `prisma/schema.prisma`

### Core Models

#### User Models

**User**
- Primary user account model
- Authentication (email/password, OAuth)
- Profile information
- Security tracking
- Relations: appointments, messages, posts, reviews, etc.

**EmailVerificationToken**
- Email verification tokens
- Expiration tracking

**PasswordResetToken**
- Password reset tokens
- One-time use

**UserPhoto**
- User photo gallery
- Multiple photos per user

#### Professional Models

**Professional**
- Professional profile
- Rates and venue types
- Company cut percentage
- Stripe payment information
- Relations: appointments, applications, availability

**ProfessionalApplication**
- Application workflow tracking
- Status: FORM_PENDING → APPROVED/REJECTED
- Quiz attempts
- Video watch tracking

**ProQuizAttempt**
- Quiz attempt records
- Score and pass/fail
- Retry tracking

**Availability**
- Weekly schedule
- Time slots per day
- Break duration

**Discount**
- Professional discounts
- Special rates

#### Appointment Models

**Appointment**
- Booking details
- User and professional
- Date, time, venue
- Status tracking
- Payment linkage

**AppointmentConfirmation**
- Confirmation from both parties
- Auto-resolution
- Dispute tracking

**Payment**
- Payment records
- Stripe integration
- Appointment or order linkage

#### Financial Models

**PayoutCycle**
- Bi-monthly cycles (1st-15th, 16th-end)
- Status tracking
- Auto-confirmation deadline

**Earning**
- Per-session earnings
- Platform fee calculation
- Status: pending → confirmed → charged

**FeeCharge**
- Aggregated fees per professional per cycle
- Stripe charge tracking
- Retry mechanism

#### Communication Models

**Conversation**
- Two-party conversations
- Read status
- Last message tracking

**Message**
- Text, audio, image messages
- System messages
- Proposal linkage

**Proposal**
- Appointment proposals
- Status tracking
- Initiator tracking

#### Video Models

**VideoSession**
- Chime meeting information
- Participant tracking
- Session duration
- Status tracking

**VideoAttendee**
- Attendee details
- Join/leave tracking

#### Community Models

**Post**
- Forum posts
- Category
- Author

**Reply**
- Post replies
- Nested replies

**Review**
- Professional reviews
- Rating and feedback

#### E-commerce Models

**Merchandise**
- Product catalog
- Pricing and stock

**Cart**
- User shopping cart

**CartItem**
- Cart items

**Order**
- Order details

**OrderItem**
- Order line items

#### Other Models

**ProfileVisit**
- Profile view tracking

**Block**
- User blocking

**Report**
- User/professional reports
- Admin response

**Feedback**
- Platform feedback

**Note**
- Personal notes

**SecurityLog**
- Security events

**CompanySettings**
- System configuration

**TrainingVideo**
- Training video metadata

**TrainingVideoWatch**
- Watch progress tracking

**RateLimitRecord**
- Rate limiting tracking

### Enums

**ProOnboardingStatus**
- FORM_PENDING
- FORM_SUBMITTED
- VIDEO_PENDING
- QUIZ_PENDING
- QUIZ_PASSED
- QUIZ_FAILED
- ADMIN_REVIEW
- APPROVED
- REJECTED
- SUSPENDED

**VideoSessionStatus**
- SCHEDULED
- WAITING
- IN_PROGRESS
- COMPLETED
- CANCELLED
- NO_SHOW
- FAILED

**VenueType**
- host
- visit
- both

**AppointmentVenue**
- host
- visit

---

## API Routes

### API Structure

**Base Path**: `/api/`

**Pattern**: RESTful API with Next.js API routes

### Authentication APIs

**Path**: `/api/auth/`

- `POST /register` - Register new user
- `POST /signin` - Login
- `POST /signout` - Logout
- `GET /session` - Get session
- `POST /verify-email` - Verify email
- `POST /resend-verification` - Resend verification
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `GET /check-admin` - Check admin status

### User APIs

**Path**: `/api/users/`

- `GET /profile` - Get own profile
- `PATCH /profile` - Update profile
- `POST /upload-photo` - Upload profile image
- `POST /photos` - Add gallery photo
- `DELETE /photos/[id]` - Delete photo

### Professional APIs

**Path**: `/api/professionals/`

- `GET /` - List professionals
- `GET /[id]` - Professional details
- `GET /[id]/availability` - Get availability
- `GET /[id]/reviews` - Get reviews
- `GET /search` - Search professionals
- `POST /availability` - Set availability
- `PATCH /availability/[id]` - Update availability

### Appointment APIs

**Path**: `/api/appointment/`

- `POST /book` - Book appointment
- `GET /user` - Get user appointments
- `GET /[id]` - Appointment details
- `PATCH /[id]` - Update appointment
- `DELETE /[id]` - Cancel appointment
- `POST /[id]/confirm` - Confirm appointment
- `POST /[id]/dispute` - Dispute appointment
- `POST /check-availability` - Check availability

### Messaging APIs

**Path**: `/api/conversations/`, `/api/messages/`

- `GET /conversations` - List conversations
- `GET /conversations/[id]` - Conversation details
- `GET /messages/[conversationId]` - Get messages
- `POST /messages/send` - Send message
- `POST /messages/audio` - Send audio message
- `POST /messages/image` - Send image message

### Proposal APIs

**Path**: `/api/proposals/`

- `POST /create` - Create proposal
- `POST /[id]/accept` - Accept proposal
- `POST /[id]/decline` - Decline proposal
- `GET /` - Get proposals

### Video APIs

**Path**: `/api/video/`

- `POST /create-session` - Create session
- `GET /session/[id]` - Session details
- `POST /join` - Join session
- `POST /leave` - Leave session
- `PATCH /session/[id]` - Update session

### Payment APIs

**Path**: `/api/payments/`

- `GET /methods` - List payment methods
- `POST /add-method` - Add payment method
- `DELETE /methods/[id]` - Remove method
- `PATCH /methods/[id]/default` - Set default
- `GET /history` - Payment history

### Admin APIs

**Path**: `/api/admin/`

See [Admin Documentation](./ADMIN_DOCUMENTATION.md) for complete admin API reference.

### Other APIs

- `/api/posts/` - Forum posts
- `/api/reviews/` - Reviews
- `/api/feedback/` - Feedback
- `/api/notifications/` - Notifications
- `/api/push/` - Push notifications
- `/api/merchandise/` - Merchandise
- `/api/blocks/` - User blocking
- `/api/reports/` - Reports
- `/api/profile-visits/` - Profile visits
- `/api/notes/` - Notes
- `/api/trainingvideos/` - Training videos
- `/api/discounts/` - Discounts
- `/api/settings/` - Settings

---

## Infrastructure

### AWS Infrastructure

**IaC Tool**: AWS CDK (TypeScript)

**Infrastructure Files**: `src/infrastructure/`

### Stacks

#### 1. WebSocket Stack (`websocket-stack.ts`)

**Purpose**: Real-time messaging infrastructure

**Resources**:
- API Gateway WebSocket API
- Lambda functions:
  - `ws-connect` - Handle connections
  - `ws-disconnect` - Handle disconnections
  - `ws-message` - Handle messages
- DynamoDB table for connection tracking
- IAM roles and permissions

**Environment Variables**:
- `WEBSOCKET_API_ENDPOINT` - WebSocket endpoint URL

#### 2. Notification Stack (`notification-stack.ts`)

**Purpose**: Push notification system

**Resources**:
- SNS topics for notifications
- SQS queues for message processing
- Lambda function for notification processing
- IAM roles and permissions

**Notification Types**:
- Appointment reminders
- New messages
- Proposal notifications
- System announcements

#### 3. Chime Stack (`chime-stack.ts`)

**Purpose**: Video session infrastructure

**Resources**:
- Chime SDK configuration
- IAM roles for Chime access

**Features**:
- Meeting creation
- Attendee management
- Media placement

#### 4. Payment Scheduler Stack (`payment-scheduler-stack.ts`)

**Purpose**: Automated payment processing

**Resources**:
- EventBridge rules for scheduled tasks
- Lambda function for payment processing
- SQS queues for retry logic
- IAM roles and permissions

**Scheduled Tasks**:
- Auto-confirm appointments (end of payout cycle)
- Process fee charges
- Retry failed payments

### Lambda Functions

**Location**: `src/lambda/`

#### WebSocket Lambdas

**ws-connect.ts**
- Handle WebSocket connections
- Store connection ID in DynamoDB
- Associate with user ID

**ws-disconnect.ts**
- Handle disconnections
- Remove connection from DynamoDB
- Update user online status

**ws-message.ts**
- Handle incoming messages
- Broadcast to recipients
- Store messages in database

#### Notification Lambda

**notifications/notification-processor.ts**
- Process notification queue
- Send push notifications
- Send email notifications
- Track notification delivery

#### Payment Lambda

**payments/payment-processor.ts**
- Auto-confirm appointments
- Calculate platform fees
- Process Stripe charges
- Handle payment failures
- Retry logic

### S3 Buckets

**Usage**:
- User profile images
- Professional images
- Message images
- Merchandise images
- Training videos

**Configuration**:
- Public read access for images
- Presigned URLs for uploads
- CORS configuration

### Environment Variables

**Required Variables**:
```env
# Database
DATABASE_URL=mongodb://...

# NextAuth
NEXTAUTH_URL=https://...
NEXTAUTH_SECRET=...

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
APPLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...

# AWS
AWS_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...
WEBSOCKET_API_ENDPOINT=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Email
RESEND_API_KEY=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...

# Push Notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Geocoding
GEOCODING_API_KEY=...
```

---

## Shared Libraries

### Location: `src/lib/`

### Authentication (`auth.ts`)

**Functions**:
- `hashPassword(password)` - Hash password with bcrypt
- `verifyPassword(password, hash)` - Verify password
- `generateToken()` - Generate secure tokens
- `createEmailVerificationToken(userId)` - Create verification token
- `verifyEmailToken(token)` - Verify email token
- `createPasswordResetToken(userId)` - Create reset token
- `verifyResetToken(token)` - Verify reset token

### Prisma (`prisma.ts`)

**Export**: Singleton Prisma client

```typescript
import { prisma } from '@/lib/prisma';
```

### S3 Storage (`s3.ts`)

**Functions**:
- `uploadToS3(file, key)` - Upload file to S3
- `deleteFromS3(key)` - Delete file from S3
- `getPresignedUrl(key)` - Get presigned URL
- `uploadImage(file, folder)` - Upload image with optimization

### Supabase (`supabase.ts`)

**Export**: Supabase client

```typescript
import { supabase } from '@/lib/supabase';
```

### Email (`email.ts`)

**Functions**:
- `sendEmail(to, subject, html)` - Send email
- `sendVerificationEmail(user, token)` - Send verification
- `sendPasswordResetEmail(user, token)` - Send reset
- `sendAppointmentConfirmation(appointment)` - Send confirmation

### Notifications (`notifications.ts`)

**Functions**:
- `sendNotification(userId, notification)` - Send in-app notification
- `sendPushNotification(userId, notification)` - Send push
- `sendEmailNotification(userId, notification)` - Send email
- `createNotification(data)` - Create notification record

### SNS Notifications (`notifications-sns.ts`)

**Functions**:
- `publishToSNS(topic, message)` - Publish to SNS topic
- `sendAppointmentReminder(appointment)` - Send reminder
- `sendMessageNotification(message)` - Send message notification

### Push Notifications (`push.ts`)

**Functions**:
- `subscribeToPush(subscription)` - Subscribe to push
- `unsubscribeFromPush(userId)` - Unsubscribe
- `sendPush(userId, notification)` - Send push notification

### WebSocket (`websocket/`)

**client.ts**
- `connectWebSocket()` - Connect to WebSocket
- `disconnectWebSocket()` - Disconnect
- `sendMessage(message)` - Send message
- `subscribeToMessages(callback)` - Subscribe to messages

**server.ts**
- `broadcastMessage(connectionIds, message)` - Broadcast to connections
- `sendToConnection(connectionId, message)` - Send to specific connection

### Utilities (`utils.ts`)

**Functions**:
- `cn(...classes)` - Merge class names (tailwind-merge)
- `formatDate(date)` - Format date
- `formatCurrency(amount)` - Format currency
- `generateUsername(name)` - Generate unique username
- `validateEmail(email)` - Validate email
- `validatePhone(phone)` - Validate phone number
- `slugify(text)` - Create URL slug

### Validation (`validations/`)

**Schemas** (Zod):
- `registerSchema` - Registration validation
- `loginSchema` - Login validation
- `profileSchema` - Profile update validation
- `appointmentSchema` - Appointment booking validation
- `messageSchema` - Message validation

### Services (`services/`)

**Organized by domain**:
- `appointment-service.ts` - Appointment business logic
- `payment-service.ts` - Payment processing
- `professional-service.ts` - Professional management
- `user-service.ts` - User management
- `message-service.ts` - Messaging logic
- `notification-service.ts` - Notification logic
- `video-service.ts` - Video session logic

### Constants (`constants/`)

**Files**:
- `index.ts` - General constants
- `routes.ts` - Route constants

---

## Components

### Location: `src/components/`

### UI Components (`ui/`)

**shadcn/ui components**:
- `button.tsx` - Button component
- `input.tsx` - Input component
- `dialog.tsx` - Dialog/modal
- `dropdown-menu.tsx` - Dropdown menu
- `select.tsx` - Select dropdown
- `checkbox.tsx` - Checkbox
- `radio-group.tsx` - Radio buttons
- `switch.tsx` - Toggle switch
- `slider.tsx` - Slider
- `tabs.tsx` - Tabs
- `accordion.tsx` - Accordion
- `alert-dialog.tsx` - Alert dialog
- `avatar.tsx` - Avatar
- `card.tsx` - Card
- `label.tsx` - Form label
- `progress.tsx` - Progress bar
- `scroll-area.tsx` - Scroll area
- `separator.tsx` - Separator
- `tooltip.tsx` - Tooltip
- And more...

### Layout Components (`layout/`)

- `Header.tsx` - Main header
- `Sidebar.tsx` - Navigation sidebar
- `Footer.tsx` - Footer
- `Navigation.tsx` - Navigation menu
- `MobileNav.tsx` - Mobile navigation

### Feature Components

**Admin** (`admin/`):
- Admin-specific components
- User management tables
- Professional application review
- Statistics dashboards

**Auth** (`auth/`):
- Login form
- Registration form
- Password reset form
- OAuth buttons

**Dashboard** (`dashboard/`):
- Dashboard widgets
- Statistics cards
- Quick actions
- Recent activity

**Professionals** (`professionals/`):
- Professional card
- Professional list
- Professional profile
- Booking calendar
- Availability display
- Review display

**Chat** (`chat/`):
- Conversation list
- Message thread
- Message input
- Audio recorder
- Image uploader

**Payments** (`payments/`):
- Payment form
- Payment method list
- Payment history
- Checkout flow

**Merchandise** (`merchandise/`):
- Product card
- Product list
- Shopping cart
- Checkout

**Profile** (`profile/`):
- Profile view
- Profile editor
- Photo gallery
- Profile stats

**Edit Profile** (`edit-profile/`):
- Profile form sections
- Image uploader
- Location picker
- Rich text editor

**Training Videos** (`trainingvideos/`):
- Video player
- Video list
- Progress tracker

### Shared Components

- `AppointmentCard.tsx` - Appointment display
- `ProposalCard.tsx` - Proposal display
- `ProposalDialog.tsx` - Proposal actions
- `UserCard.tsx` - User card
- `VideoSession.tsx` - Video call interface
- `NotificationsDropdown.tsx` - Notifications
- `PushNotificationManager.tsx` - Push notification handler
- `ConfirmDialog.tsx` - Confirmation dialog
- `RichTextEditor.tsx` - Rich text editor
- `NotesSidebar.tsx` - Notes sidebar
- `DraggableNoteDialog.tsx` - Draggable notes
- `IncomingCallDialog.tsx` - Incoming call UI
- `LastOnlineUpdater.tsx` - Online status updater
- `ClientSessionProvider.tsx` - Session provider

---

## Hooks

### Location: `src/hooks/`

### Custom Hooks

**useWebSocket.ts**
- WebSocket connection management
- Auto-reconnect
- Message handling
- Online status

**useVideoCall.ts**
- Video call management
- Chime SDK integration
- Participant tracking
- Call controls

**useUserProfile.tsx**
- Fetch user profile
- Profile caching
- Profile updates

**useCart.ts**
- Shopping cart management
- Add/remove items
- Update quantities
- Cart total

**useDebounce.ts**
- Debounce values
- Search optimization

**use-mobile.ts**
- Mobile detection
- Responsive behavior

### Dashboard Hooks (`dashboard/`)

**useDashboardStats.ts**
- Dashboard statistics
- Data fetching

### Edit Profile Hooks (`edit-profile/`)

**useProfileForm.ts**
- Profile form state
- Validation
- Submission

**useImageUpload.ts**
- Image upload handling
- Preview generation

### Payment Hooks (`payments/`)

**useStripe.ts**
- Stripe integration
- Payment processing

**usePaymentMethods.ts**
- Payment method management
- Default method

### Professional Hooks (`professionals/`)

**useProfessionals.ts**
- Fetch professionals
- Filtering
- Sorting

**useAvailability.ts**
- Availability management
- Slot selection

**useBooking.ts**
- Booking flow
- Availability checking

---

## Utilities

### Date/Time

**Libraries**: date-fns, date-fns-tz, moment

**Functions**:
- Format dates
- Parse dates
- Timezone conversion
- Relative time

### Validation

**Library**: Zod

**Schemas**: See `src/lib/validations/`

### Form Handling

**Library**: React Hook Form

**Integration**: Zod resolver for validation

### State Management

**Library**: Zustand

**Stores**:
- User store
- Cart store
- Notification store

### Data Fetching

**Library**: SWR

**Features**:
- Caching
- Revalidation
- Optimistic updates

### Styling

**Library**: Tailwind CSS

**Utilities**:
- `cn()` - Class name merging
- `cva()` - Class variance authority

---

## Security

### Authentication Security

**Password Hashing**: bcrypt (10 rounds)

**Session Management**: NextAuth.js with JWT

**CSRF Protection**: Built-in Next.js CSRF

**Rate Limiting**: Custom rate limiting with MongoDB

### API Security

**Authentication**: Required for most endpoints

**Authorization**: Role-based (admin flag)

**Input Validation**: Zod schemas

**SQL Injection**: Prevented by Prisma ORM

### Data Security

**Encryption**: HTTPS only

**Sensitive Data**: Environment variables

**File Uploads**: Validated file types and sizes

**XSS Protection**: React auto-escaping

### Payment Security

**PCI Compliance**: Stripe handles card data

**Webhook Verification**: Stripe signature verification

**Secure Storage**: No card data stored locally

---

## Deployment

### Build Process

**Commands**:
```bash
npm run build          # Build Next.js app
npm run build:lambda   # Build Lambda functions
npm run cdk:deploy     # Deploy infrastructure
```

### Deployment Platforms

**Frontend**: Vercel, AWS Amplify

**Infrastructure**: AWS CDK

**Database**: MongoDB Atlas

### Environment Setup

1. Set environment variables
2. Deploy infrastructure (CDK)
3. Deploy application (Vercel/Amplify)
4. Run database migrations (Prisma)

### CI/CD

**Platform**: GitHub Actions (recommended)

**Pipeline**:
1. Lint and test
2. Build application
3. Build Lambda functions
4. Deploy infrastructure
5. Deploy application

### Monitoring

**Application**: Vercel Analytics

**Infrastructure**: AWS CloudWatch

**Errors**: Error tracking (Sentry recommended)

---

## Development

### Local Development

**Setup**:
```bash
npm install
npm run dev
```

**Database**:
```bash
npx prisma generate
npx prisma db push
```

**Environment**: Copy `.env.local` and fill in values

### Testing

**Unit Tests**: Jest (recommended)

**E2E Tests**: Playwright (recommended)

**API Tests**: Postman/Insomnia

### Code Quality

**Linting**: ESLint

**Formatting**: Prettier (recommended)

**Type Checking**: TypeScript

---

## Best Practices

### Code Organization

- Feature-based folder structure
- Shared components in `components/`
- Business logic in `lib/services/`
- Types in `types/`

### Performance

- Use SWR for data fetching
- Implement code splitting
- Optimize images
- Lazy load components

### Security

- Validate all inputs
- Use environment variables
- Implement rate limiting
- Regular security audits

### Accessibility

- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation
- Test with screen readers

---

*Last Updated: January 2026*
