# Hug Harmony - User Side Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication & Registration](#authentication--registration)
3. [User Dashboard](#user-dashboard)
4. [Profile Management](#profile-management)
5. [Professional Discovery](#professional-discovery)
6. [Appointments & Booking](#appointments--booking)
7. [Messaging System](#messaging-system)
8. [Video Sessions](#video-sessions)
9. [Payments & Orders](#payments--orders)
10. [Community Features](#community-features)
11. [Notifications](#notifications)
12. [API Routes](#api-routes)

---

## Overview

Hug Harmony is a platform connecting users with professional cuddlers and companions. The user-side application provides features for discovering professionals, booking appointments, messaging, video sessions, and community engagement.

**Tech Stack**: Next.js 15, React 19, TypeScript, MongoDB, Prisma, NextAuth.js

**Base Route**: `/dashboard`

---

## Authentication & Registration

### 1. User Registration (`/register`)

**Purpose**: Create a new user account

**Registration Methods**:
- Email and password
- Google OAuth
- Apple OAuth
- Facebook OAuth

**Registration Fields**:
- Email (required)
- Password (required for email registration)
- First Name
- Last Name
- Phone Number (optional)
- How did you hear about us? (optional)

**Features**:
- Email validation
- Password strength requirements
- Duplicate email detection
- Email verification required
- Rate limiting for security

**API Endpoints**:
- `POST /api/auth/register` - Create new account
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/resend-verification` - Resend verification email

**Database Models**:
- `User` - User account information
- `EmailVerificationToken` - Email verification tokens

### 2. Login (`/login`)

**Purpose**: Authenticate existing users

**Login Methods**:
- Email and password
- Google OAuth
- Apple OAuth
- Facebook OAuth

**Features**:
- Remember me functionality
- Failed login attempt tracking
- Account lockout after 5 failed attempts
- IP address logging
- Last login tracking

**Security Features**:
- Password hashing with bcrypt
- Rate limiting
- CSRF protection
- Session management

**API Endpoints**:
- `POST /api/auth/signin` - Login with credentials
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signout` - Logout

**Database Models**:
- `User` - Authentication credentials
- `SecurityLog` - Login attempt tracking

### 3. Password Management

**Reset Password** (`/reset-password`):
- Request password reset via email
- Token-based reset link (expires in 1 hour)
- Set new password

**API Endpoints**:
- `POST /api/auth/forgot-password` - Request reset
- `POST /api/auth/reset-password` - Reset with token

**Database Models**:
- `PasswordResetToken` - Reset tokens with expiration

### 4. Email Verification

**Verification Pending** (`/verification-pending`):
- Shown after registration
- Resend verification email option
- Check verification status

**Verify Email** (`/verify-email`):
- Token-based verification
- Auto-login after verification
- Redirect to dashboard

**Resend Verification** (`/resend-verification`):
- Request new verification email
- Rate limited to prevent abuse

---

## User Dashboard

### Main Dashboard (`/dashboard/page.tsx`)

**Purpose**: Central hub for user activities

**Dashboard Sections**:

1. **Quick Stats**:
   - Upcoming appointments
   - Unread messages
   - New notifications
   - Profile completion status

2. **Upcoming Appointments**:
   - Next 5 appointments
   - Quick view of time, professional, venue
   - Join video session button
   - Cancel/reschedule options

3. **Recent Messages**:
   - Latest conversations
   - Unread message indicators
   - Quick reply access

4. **Recommended Professionals**:
   - Based on preferences
   - Nearby professionals
   - Highly rated professionals

5. **Quick Actions**:
   - Find professionals
   - Book appointment
   - View messages
   - Edit profile

**Components**:
- `src/components/dashboard/` - Dashboard-specific components
- Appointment cards
- Message previews
- Professional recommendations

---

## Profile Management

### 1. View Profile (`/dashboard/profile`)

**Purpose**: Display user's public profile

**Profile Information**:
- Profile image
- Name and username
- Biography
- Location
- Personal details (age, height, ethnicity, etc.)
- Relationship status
- Orientation
- Interests and preferences
- Photo gallery

**Features**:
- Public profile view
- Profile visit tracking
- Share profile option

**API Endpoints**:
- `GET /api/profiles/[username]` - Get public profile
- `POST /api/profile-visits` - Track profile visit

**Database Models**:
- `User` - Profile information
- `UserPhoto` - Photo gallery
- `ProfileVisit` - Visit tracking

### 2. Edit Profile (`/dashboard/edit-profile`)

**Purpose**: Update user profile information

**Editable Sections**:

1. **Basic Information**:
   - First name, last name
   - Username (unique)
   - Email
   - Phone number

2. **Profile Details**:
   - Profile image upload
   - Biography (rich text editor)
   - Location (with geocoding)

3. **Personal Information**:
   - Relationship status
   - Sexual orientation
   - Height
   - Ethnicity
   - Zodiac sign
   - Favorite color
   - Favorite media
   - Pet ownership

4. **Photo Gallery**:
   - Upload multiple photos
   - Delete photos
   - Reorder photos

**Features**:
- Image upload to S3/Supabase
- Real-time validation
- Auto-save drafts
- Preview changes

**API Endpoints**:
- `PATCH /api/users/profile` - Update profile
- `POST /api/users/upload-photo` - Upload profile image
- `POST /api/users/photos` - Add gallery photo
- `DELETE /api/users/photos/[id]` - Delete photo

**Components**:
- `src/components/edit-profile/` - Profile editing components
- Image upload component
- Rich text editor
- Location picker

**Validation**:
- `src/lib/validate-edit-profile.ts` - Profile validation rules

---

## Professional Discovery

### 1. Browse Professionals (`/dashboard/professionals`)

**Purpose**: Discover and search for professionals

**Features**:
- Grid/list view toggle
- Search by name
- Filter options:
  - Location/distance
  - Rate range
  - Rating
  - Venue type (host/visit/both)
  - Availability
- Sort options:
  - Rating (high to low)
  - Rate (low to high)
  - Distance
  - Newest

**Professional Card Display**:
- Profile image
- Name
- Rating and review count
- Hourly rate
- Location
- Venue types
- Quick book button
- View profile button

**API Endpoints**:
- `GET /api/professionals` - List professionals with filters
- `GET /api/professionals/search` - Search professionals

**Database Models**:
- `Professional` - Professional profiles
- `Review` - Professional reviews
- `Availability` - Professional availability

**Components**:
- `src/components/professionals/` - Professional browsing components
- Professional card
- Filter sidebar
- Search bar

### 2. Professional Profile (`/dashboard/professionals/[id]`)

**Purpose**: View detailed professional profile

**Profile Sections**:

1. **Header**:
   - Profile image
   - Name
   - Rating and review count
   - Hourly rate
   - Venue types
   - Book now button
   - Message button

2. **About**:
   - Biography
   - Location
   - Experience

3. **Availability**:
   - Weekly schedule
   - Available time slots
   - Break duration

4. **Reviews**:
   - All reviews with ratings
   - Filter by rating
   - Sort by date/rating

5. **Discounts**:
   - Special rates
   - Package deals

**Features**:
- Track profile visits
- Add to favorites
- Share profile
- Report professional
- Block professional

**API Endpoints**:
- `GET /api/professionals/[id]` - Get professional details
- `GET /api/professionals/[id]/availability` - Get availability
- `GET /api/professionals/[id]/reviews` - Get reviews
- `POST /api/profile-visits` - Track visit

---

## Appointments & Booking

### 1. Book Appointment

**Booking Flow**:

1. **Select Professional**:
   - From professional profile
   - Or from search results

2. **Choose Date & Time**:
   - Calendar view
   - Available slots only
   - Timezone handling

3. **Select Venue**:
   - Host (professional's location)
   - Visit (user's location)
   - Based on professional's offerings

4. **Confirm Details**:
   - Review date, time, venue
   - See total cost
   - Apply discounts if available

5. **Payment**:
   - Enter payment details
   - Stripe integration
   - Secure payment processing

6. **Confirmation**:
   - Booking confirmed
   - Email confirmation sent
   - Calendar invite (.ics file)
   - Add to calendar options

**API Endpoints**:
- `GET /api/professionals/[id]/availability` - Get available slots
- `POST /api/appointment/book` - Create appointment
- `POST /api/appointment/check-availability` - Verify slot availability

**Database Models**:
- `Appointment` - Appointment details
- `Payment` - Payment record

**Components**:
- `src/components/professionals/BookingCalendar.tsx` - Booking calendar
- Payment form components

### 2. View Appointments (`/dashboard/appointments`)

**Purpose**: Manage user's appointments

**Appointment Views**:

1. **Calendar View**:
   - Monthly calendar
   - Appointments displayed on dates
   - Color-coded by status
   - Click to view details

2. **List View**:
   - Upcoming appointments
   - Past appointments
   - Cancelled appointments
   - Filter and sort options

**Appointment Details**:
- Professional information
- Date and time
- Venue
- Status
- Payment status
- Video session link (if applicable)
- Cancel/reschedule options

**Appointment Statuses**:
- `upcoming` - Scheduled
- `completed` - Session finished
- `cancelled` - User/professional cancelled
- `disputed` - Under dispute

**Actions Available**:
- Join video session (when active)
- Cancel appointment
- Reschedule appointment
- Leave review (after completion)
- Report issue
- Download receipt

**API Endpoints**:
- `GET /api/appointment/user` - Get user's appointments
- `PATCH /api/appointment/[id]` - Update appointment
- `DELETE /api/appointment/[id]` - Cancel appointment
- `POST /api/appointment/[id]/reschedule` - Reschedule

**Components**:
- `src/components/AppointmentCard.tsx` - Appointment display
- Calendar component (FullCalendar)
- Appointment filters

### 3. Appointment Confirmation

**Purpose**: Confirm appointment occurred

**Confirmation Flow**:
- After appointment end time
- Both parties must confirm
- Deadline: End of payout cycle
- Auto-marked as "not occurred" if no confirmation

**User Actions**:
- Confirm appointment occurred
- Mark as did not occur
- Dispute if disagreement

**API Endpoints**:
- `POST /api/appointment/[id]/confirm` - Confirm appointment
- `POST /api/appointment/[id]/dispute` - Dispute appointment

**Database Models**:
- `AppointmentConfirmation` - Confirmation tracking

---

## Messaging System

### 1. Conversations (`/dashboard/messaging`)

**Purpose**: Real-time messaging with professionals

**Features**:
- Real-time messaging via WebSocket
- Conversation list with last message preview
- Unread message indicators
- Search conversations
- Message notifications
- Typing indicators
- Read receipts

**Message Types**:
- Text messages
- Audio messages
- Image messages
- System messages (appointment proposals)

**Conversation List**:
- Professional name and image
- Last message preview
- Timestamp
- Unread count
- Online status indicator

**Message Thread**:
- Chronological message display
- Send text messages
- Record and send audio
- Upload and send images
- Appointment proposals
- Message timestamps
- Delivery status

**API Endpoints**:
- `GET /api/conversations` - List conversations
- `GET /api/conversations/[id]` - Get conversation details
- `GET /api/messages/[conversationId]` - Get messages
- `POST /api/messages/send` - Send message
- `POST /api/messages/audio` - Send audio message
- `POST /api/messages/image` - Send image message

**WebSocket Events**:
- `message:new` - New message received
- `message:read` - Message read
- `typing:start` - User typing
- `typing:stop` - User stopped typing
- `user:online` - User came online
- `user:offline` - User went offline

**Database Models**:
- `Conversation` - Conversation metadata
- `Message` - Individual messages

**Components**:
- `src/components/chat/` - Chat components
- Conversation list
- Message thread
- Message input
- Audio recorder

**Hooks**:
- `src/hooks/useWebSocket.ts` - WebSocket connection management

### 2. Appointment Proposals

**Purpose**: Professionals can propose appointments via messages

**Proposal Flow**:
1. Professional sends proposal with:
   - Proposed date and time
   - Venue (host/visit)
   - Rate
2. User receives proposal in chat
3. User can:
   - Accept (creates appointment)
   - Decline
   - Counter-propose

**Proposal Statuses**:
- `pending` - Awaiting response
- `accepted` - Accepted, appointment created
- `declined` - Declined by user
- `expired` - Proposal expired

**API Endpoints**:
- `POST /api/proposals/create` - Create proposal
- `POST /api/proposals/[id]/accept` - Accept proposal
- `POST /api/proposals/[id]/decline` - Decline proposal

**Database Models**:
- `Proposal` - Proposal details

**Components**:
- `src/components/ProposalCard.tsx` - Proposal display
- `src/components/ProposalDialog.tsx` - Proposal actions

---

## Video Sessions

### 1. Video Call Interface (`/dashboard/video-session/[id]`)

**Purpose**: Conduct video sessions with professionals

**Video Platform**: Amazon Chime SDK

**Features**:
- HD video and audio
- Screen sharing
- Mute/unmute controls
- Camera on/off
- End call button
- Participant list
- Connection quality indicator
- Recording (if enabled)

**Session Flow**:
1. **Join Session**:
   - Click "Join" from appointment
   - Camera/microphone permissions
   - Enter waiting room

2. **Active Session**:
   - Video call interface
   - Controls overlay
   - Chat sidebar (optional)
   - Session timer

3. **End Session**:
   - Either party can end
   - Confirmation prompt
   - Session summary
   - Leave review prompt

**API Endpoints**:
- `POST /api/video/create-session` - Create video session
- `GET /api/video/session/[id]` - Get session details
- `POST /api/video/join` - Join session
- `POST /api/video/leave` - Leave session
- `PATCH /api/video/session/[id]` - Update session status

**Database Models**:
- `VideoSession` - Session metadata
- `VideoAttendee` - Participant tracking

**Components**:
- `src/components/VideoSession.tsx` - Video interface
- Chime SDK components

**Hooks**:
- `src/hooks/useVideoCall.ts` - Video call management

**Infrastructure**:
- AWS Chime SDK for video
- `src/infrastructure/chime-stack.ts` - Chime infrastructure

---

## Payments & Orders

### 1. Payment Methods (`/dashboard/payment`)

**Purpose**: Manage payment methods

**Features**:
- Add credit/debit card
- Stripe integration
- Save multiple cards
- Set default payment method
- Remove payment methods
- Secure card storage

**API Endpoints**:
- `GET /api/payments/methods` - List payment methods
- `POST /api/payments/add-method` - Add payment method
- `DELETE /api/payments/methods/[id]` - Remove method
- `PATCH /api/payments/methods/[id]/default` - Set default

**Database Models**:
- Payment methods stored in Stripe
- `Payment` - Payment records

### 2. Payment History

**Purpose**: View past payments

**Payment Types**:
- Appointment payments
- Merchandise orders
- Refunds

**Payment Information**:
- Date and time
- Amount
- Payment method
- Status
- Receipt download

**API Endpoints**:
- `GET /api/payments/history` - Get payment history

### 3. Merchandise Store (`/dashboard/merchandise`)

**Purpose**: Browse and purchase merchandise

**Features**:
- Product catalog
- Product details
- Add to cart
- Shopping cart
- Checkout process
- Order tracking

**Product Display**:
- Product image
- Name and description
- Price
- Stock availability
- Add to cart button

**Shopping Cart**:
- View cart items
- Update quantities
- Remove items
- See total
- Proceed to checkout

**Checkout Flow**:
1. Review cart
2. Enter shipping address
3. Select payment method
4. Confirm order
5. Payment processing
6. Order confirmation

**API Endpoints**:
- `GET /api/merchandise` - List products
- `GET /api/merchandise/[id]` - Product details
- `POST /api/merchandise/cart/add` - Add to cart
- `GET /api/merchandise/cart` - Get cart
- `PATCH /api/merchandise/cart/[id]` - Update cart item
- `DELETE /api/merchandise/cart/[id]` - Remove from cart
- `POST /api/merchandise/checkout` - Checkout

**Database Models**:
- `Merchandise` - Products
- `Cart` - User cart
- `CartItem` - Cart items
- `Order` - Orders
- `OrderItem` - Order items

**Components**:
- `src/components/merchandise/` - Merchandise components

**Hooks**:
- `src/hooks/useCart.ts` - Cart management

### 4. Orders (`/dashboard/orders`)

**Purpose**: View order history and status

**Order Information**:
- Order number
- Date
- Items
- Total amount
- Status
- Tracking information

**Order Statuses**:
- `pending` - Payment processing
- `paid` - Payment confirmed
- `shipped` - Order shipped
- `delivered` - Order delivered
- `cancelled` - Order cancelled

**API Endpoints**:
- `GET /api/merchandise/orders` - Get orders
- `GET /api/merchandise/orders/[id]` - Order details

---

## Community Features

### 1. Forum (`/dashboard/forum`)

**Purpose**: Community discussion board

**Features**:
- Browse posts by category
- Create new posts
- Reply to posts
- Nested replies
- Search posts
- Filter by category

**Categories**:
- General Discussion
- Advice & Support
- Success Stories
- Questions
- Off-Topic

**Post Display**:
- Title
- Content (rich text)
- Author
- Timestamp
- Reply count
- Category

**Actions**:
- Create post
- Reply to post
- Edit own posts
- Delete own posts
- Report inappropriate content

**API Endpoints**:
- `GET /api/posts` - List posts
- `GET /api/posts/[id]` - Get post details
- `POST /api/posts` - Create post
- `PATCH /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post
- `POST /api/posts/[id]/reply` - Add reply
- `DELETE /api/posts/[id]/replies/[replyId]` - Delete reply

**Database Models**:
- `Post` - Forum posts
- `Reply` - Post replies

### 2. Reviews & Feedback

**Leave Review**:
- After completed appointment
- Rate professional (1-5 stars)
- Written feedback
- Anonymous option

**API Endpoints**:
- `POST /api/reviews` - Submit review
- `GET /api/reviews/[professionalId]` - Get professional reviews

**Database Models**:
- `Review` - User reviews

**Platform Feedback**:
- Overall experience rating
- Suggestions
- Bug reports

**API Endpoints**:
- `POST /api/feedback` - Submit feedback

**Database Models**:
- `Feedback` - User feedback

---

## Notifications

### 1. Notification System

**Notification Types**:
- New message
- Appointment reminder
- Appointment confirmed
- Appointment cancelled
- Proposal received
- Review received
- Payment confirmation
- System announcements

**Notification Channels**:
- In-app notifications
- Email notifications
- Push notifications (PWA)

**In-App Notifications** (`/dashboard/notifications`):
- Notification dropdown
- Unread count badge
- Mark as read
- Clear all
- Notification history

**API Endpoints**:
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/[id]/read` - Mark as read
- `DELETE /api/notifications/[id]` - Delete notification
- `POST /api/notifications/read-all` - Mark all as read

**Push Notifications**:
- Browser push notifications
- Service worker integration
- Notification preferences

**API Endpoints**:
- `POST /api/push/subscribe` - Subscribe to push
- `POST /api/push/unsubscribe` - Unsubscribe
- `PATCH /api/push/preferences` - Update preferences

**Components**:
- `src/components/NotificationsDropdown.tsx` - Notification UI
- `src/components/PushNotificationManager.tsx` - Push notification handler

**Infrastructure**:
- AWS SNS for notifications
- `src/infrastructure/notification-stack.ts` - Notification infrastructure
- `src/lambda/notifications/` - Notification processors

---

## Additional Features

### 1. Profile Visits (`/dashboard/profile-visits`)

**Purpose**: See who viewed your profile

**Features**:
- List of profile visitors
- Visitor profile link
- Visit timestamp
- Visitor count

**API Endpoints**:
- `GET /api/profile-visits` - Get profile visits

### 2. Notes (`/dashboard/notes`)

**Purpose**: Personal notes (admin feature for users)

**Features**:
- Create notes
- Edit notes
- Delete notes
- Draggable note dialog

**API Endpoints**:
- `GET /api/notes` - Get notes
- `POST /api/notes` - Create note
- `PATCH /api/notes/[id]` - Update note
- `DELETE /api/notes/[id]` - Delete note

**Components**:
- `src/components/NotesSidebar.tsx` - Notes sidebar
- `src/components/DraggableNoteDialog.tsx` - Note dialog

### 3. Availability Management (`/dashboard/availability`)

**Purpose**: Set availability (for professionals)

**Features**:
- Set weekly schedule
- Define time slots
- Set break duration
- Block specific dates

**API Endpoints**:
- `GET /api/professionals/availability` - Get availability
- `POST /api/professionals/availability` - Set availability
- `PATCH /api/professionals/availability/[id]` - Update availability

### 4. Discounts (`/dashboard/discounts`)

**Purpose**: View available discounts

**Features**:
- Browse professional discounts
- Filter by professional
- See discount details

**API Endpoints**:
- `GET /api/discounts` - Get discounts

### 5. Training Videos (`/dashboard/training-videos`)

**Purpose**: Educational content

**Features**:
- Browse training videos
- Watch videos
- Track progress
- Mark as completed

**API Endpoints**:
- `GET /api/trainingvideos` - List videos
- `POST /api/trainingvideos/[id]/watch` - Track watch progress

**Database Models**:
- `TrainingVideo` - Video metadata
- `TrainingVideoWatch` - Watch tracking

---

## API Routes

### User API Structure

**Base Path**: `/api/`

### Authentication APIs

- `POST /api/auth/register` - Register new user
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Get session
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/resend-verification` - Resend verification
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### User Profile APIs

- `GET /api/users/profile` - Get own profile
- `PATCH /api/users/profile` - Update profile
- `POST /api/users/upload-photo` - Upload profile image
- `POST /api/users/photos` - Add gallery photo
- `DELETE /api/users/photos/[id]` - Delete photo
- `GET /api/profiles/[username]` - Get public profile

### Professional APIs

- `GET /api/professionals` - List professionals
- `GET /api/professionals/[id]` - Professional details
- `GET /api/professionals/[id]/availability` - Get availability
- `GET /api/professionals/[id]/reviews` - Get reviews
- `GET /api/professionals/search` - Search professionals

### Appointment APIs

- `POST /api/appointment/book` - Book appointment
- `GET /api/appointment/user` - Get user appointments
- `GET /api/appointment/[id]` - Appointment details
- `PATCH /api/appointment/[id]` - Update appointment
- `DELETE /api/appointment/[id]` - Cancel appointment
- `POST /api/appointment/[id]/confirm` - Confirm appointment
- `POST /api/appointment/[id]/dispute` - Dispute appointment
- `POST /api/appointment/check-availability` - Check availability

### Messaging APIs

- `GET /api/conversations` - List conversations
- `GET /api/conversations/[id]` - Conversation details
- `GET /api/messages/[conversationId]` - Get messages
- `POST /api/messages/send` - Send message
- `POST /api/messages/audio` - Send audio message
- `POST /api/messages/image` - Send image message

### Proposal APIs

- `POST /api/proposals/create` - Create proposal
- `POST /api/proposals/[id]/accept` - Accept proposal
- `POST /api/proposals/[id]/decline` - Decline proposal
- `GET /api/proposals` - Get proposals

### Video Session APIs

- `POST /api/video/create-session` - Create session
- `GET /api/video/session/[id]` - Session details
- `POST /api/video/join` - Join session
- `POST /api/video/leave` - Leave session
- `PATCH /api/video/session/[id]` - Update session

### Payment APIs

- `GET /api/payments/methods` - List payment methods
- `POST /api/payments/add-method` - Add payment method
- `DELETE /api/payments/methods/[id]` - Remove method
- `PATCH /api/payments/methods/[id]/default` - Set default
- `GET /api/payments/history` - Payment history

### Merchandise APIs

- `GET /api/merchandise` - List products
- `GET /api/merchandise/[id]` - Product details
- `POST /api/merchandise/cart/add` - Add to cart
- `GET /api/merchandise/cart` - Get cart
- `PATCH /api/merchandise/cart/[id]` - Update cart
- `DELETE /api/merchandise/cart/[id]` - Remove from cart
- `POST /api/merchandise/checkout` - Checkout
- `GET /api/merchandise/orders` - Get orders
- `GET /api/merchandise/orders/[id]` - Order details

### Forum APIs

- `GET /api/posts` - List posts
- `GET /api/posts/[id]` - Post details
- `POST /api/posts` - Create post
- `PATCH /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post
- `POST /api/posts/[id]/reply` - Add reply

### Notification APIs

- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/[id]/read` - Mark as read
- `DELETE /api/notifications/[id]` - Delete notification
- `POST /api/notifications/read-all` - Mark all as read
- `POST /api/push/subscribe` - Subscribe to push
- `POST /api/push/unsubscribe` - Unsubscribe

### Other APIs

- `POST /api/reviews` - Submit review
- `POST /api/feedback` - Submit feedback
- `POST /api/profile-visits` - Track profile visit
- `GET /api/profile-visits` - Get profile visits
- `POST /api/blocks/block` - Block user
- `POST /api/blocks/unblock` - Unblock user
- `GET /api/blocks` - Get blocked users
- `POST /api/reports` - Submit report

---

## Database Schema (User-Related Models)

### Core User Models

**User**
- Authentication: email, password, OAuth IDs
- Profile: name, image, biography, location
- Personal details: relationship status, orientation, height, etc.
- Security: failed login attempts, account lock
- Status: email verified, admin flag, account status

**UserPhoto**
- Photo gallery for user profiles
- Multiple photos per user

**EmailVerificationToken**
- Email verification tokens
- Expiration tracking

**PasswordResetToken**
- Password reset tokens
- One-time use, expires in 1 hour

### Professional Models

**Professional**
- Profile information
- Rates and venue types
- Company cut percentage
- Stripe payment information
- Payment method validation

**ProfessionalApplication**
- Application status workflow
- Quiz attempts
- Video watch tracking

**Availability**
- Weekly schedule
- Time slots per day
- Break duration

**Discount**
- Special rates
- Professional-specific discounts

### Appointment Models

**Appointment**
- User and professional
- Date, time, venue
- Status tracking
- Payment linkage
- Dispute handling

**AppointmentConfirmation**
- Confirmation from both parties
- Auto-resolution tracking
- Dispute status

**Payment**
- Appointment or order payment
- Stripe integration
- Payment status

### Communication Models

**Conversation**
- Two-party conversations
- Read status tracking
- Last message timestamp

**Message**
- Text, audio, image messages
- System messages
- Proposal linkage

**Proposal**
- Appointment proposals
- Status tracking
- Initiator tracking

### Video Models

**VideoSession**
- Chime meeting information
- Participant tracking
- Session duration
- Status tracking

**VideoAttendee**
- Attendee details
- Join/leave tracking
- Chime attendee info

### Community Models

**Post**
- Forum posts
- Category
- Author

**Reply**
- Post replies
- Nested replies support
- Author tracking

**Review**
- Professional reviews
- Rating and feedback
- Reviewer information

### E-commerce Models

**Merchandise**
- Product catalog
- Pricing and stock
- Active status

**Cart**
- User shopping cart
- Cart items

**Order**
- Order details
- Order items
- Payment linkage

### Other Models

**ProfileVisit**
- Track profile views
- Visitor and visitee

**Block**
- User blocking
- Blocker and blocked user

**Report**
- User/professional reports
- Status and priority
- Admin response

**Feedback**
- Platform feedback
- User ratings

**Note**
- Personal notes
- Target user/professional

**SecurityLog**
- Security events
- Login attempts
- IP tracking

---

## Security & Privacy

### Authentication Security

- Password hashing with bcrypt
- Session-based authentication
- CSRF protection
- Rate limiting on auth endpoints
- Account lockout after failed attempts

### Data Privacy

- Email verification required
- Secure password reset flow
- User data encryption
- GDPR compliance considerations

### Payment Security

- PCI compliance via Stripe
- No card data stored locally
- Secure payment processing
- Transaction logging

### User Safety

- Block users
- Report users/professionals
- Content moderation
- Profile verification

---

## Progressive Web App (PWA)

### PWA Features

- Installable on mobile/desktop
- Offline support
- Push notifications
- App-like experience

### Service Worker

- Caching strategies
- Offline fallback
- Background sync

### Configuration

- `next.config.ts` - PWA configuration
- Manifest file
- Service worker registration

---

## Real-time Features

### WebSocket Connection

**Connection Management**:
- Auto-connect on login
- Auto-reconnect on disconnect
- Connection status indicator

**Events**:
- New messages
- Typing indicators
- Online/offline status
- Notifications

**Infrastructure**:
- AWS API Gateway WebSocket
- Lambda handlers for WebSocket events
- DynamoDB for connection tracking

**Files**:
- `src/hooks/useWebSocket.ts` - Client-side WebSocket hook
- `src/lambda/ws-connect.ts` - Connection handler
- `src/lambda/ws-disconnect.ts` - Disconnection handler
- `src/lambda/ws-message.ts` - Message handler
- `src/infrastructure/websocket-stack.ts` - WebSocket infrastructure

---

## Mobile Responsiveness

### Responsive Design

- Mobile-first approach
- Breakpoints for tablet and desktop
- Touch-friendly interfaces
- Optimized for various screen sizes

### Mobile-Specific Features

- Touch gestures
- Mobile navigation
- Responsive images
- Mobile-optimized forms

### Hook

- `src/hooks/use-mobile.ts` - Mobile detection hook

---

## Performance Optimization

### Code Splitting

- Route-based code splitting
- Component lazy loading
- Dynamic imports

### Image Optimization

- Next.js Image component
- Automatic image optimization
- Lazy loading images
- Responsive images

### Caching

- SWR for data fetching
- Client-side caching
- API response caching

### Hooks

- `src/hooks/useDebounce.ts` - Debounce hook for search

---

## Accessibility

### ARIA Labels

- Proper ARIA attributes
- Screen reader support
- Keyboard navigation

### Color Contrast

- WCAG AA compliance
- High contrast mode support

### Form Accessibility

- Label associations
- Error messages
- Focus management

---

## Technical Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI, shadcn/ui
- **State Management**: Zustand, SWR
- **Forms**: React Hook Form, Zod validation
- **Authentication**: NextAuth.js
- **Database**: MongoDB with Prisma ORM
- **File Storage**: AWS S3, Supabase Storage
- **Payments**: Stripe
- **Video**: Amazon Chime SDK
- **Real-time**: WebSocket (AWS API Gateway)
- **Notifications**: AWS SNS, Web Push
- **Email**: Resend, Nodemailer
- **Maps**: Leaflet, React Leaflet
- **Calendar**: FullCalendar, React Big Calendar
- **Rich Text**: TipTap
- **Charts**: Chart.js, Recharts

---

*Last Updated: January 2026*
