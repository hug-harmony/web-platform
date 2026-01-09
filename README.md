# Hug Harmony

A comprehensive platform connecting users with professional cuddlers and companions, featuring appointment booking, real-time messaging, video sessions, payment processing, and community features.

## 📚 Documentation

This project includes comprehensive documentation organized by user type and technical aspects:

### 📖 Documentation Files

1. **[Admin Documentation](./ADMIN_DOCUMENTATION.md)** - Complete guide for administrators
   - User management
   - Professional application review and management
   - Booking and payment management
   - Content management (training videos, merchandise)
   - Reporting and moderation
   - System settings and configuration
   - Analytics and statistics

2. **[User Documentation](./USER_DOCUMENTATION.md)** - Complete guide for end users
   - Authentication and registration
   - Profile management
   - Professional discovery and booking
   - Messaging system
   - Video sessions
   - Payments and orders
   - Community features (forum, reviews)
   - Notifications

3. **[Technical Documentation](./TECHNICAL_DOCUMENTATION.md)** - Complete technical reference
   - Architecture overview
   - Database schema (MongoDB/Prisma)
   - API routes reference
   - AWS infrastructure (Lambda, S3, SNS, WebSocket, Chime)
   - Shared libraries and utilities
   - Components and hooks
   - Security and deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB database
- AWS account (for infrastructure)
- Stripe account (for payments)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd hug-harmony

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS, Radix UI, shadcn/ui
- **State Management**: Zustand, SWR
- **Forms**: React Hook Form, Zod

### Backend
- **API**: Next.js API Routes
- **Database**: MongoDB with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **File Storage**: AWS S3, Supabase Storage

### Infrastructure
- **Cloud Platform**: AWS
- **Video**: Amazon Chime SDK
- **Real-time**: WebSocket (AWS API Gateway)
- **Serverless**: AWS Lambda
- **Notifications**: AWS SNS, SQS
- **IaC**: AWS CDK

## 📁 Project Structure

```
hug-harmony/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── dashboard/         # User dashboard pages
│   │   ├── api/               # API routes
│   │   └── auth/              # Authentication pages
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── admin/            # Admin components
│   │   ├── dashboard/        # Dashboard components
│   │   └── ...               # Feature components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Shared libraries
│   │   ├── services/         # Business logic
│   │   ├── validations/      # Zod schemas
│   │   └── ...               # Utilities
│   ├── infrastructure/        # AWS CDK stacks
│   ├── lambda/                # Lambda functions
│   └── types/                 # TypeScript types
├── prisma/
│   └── schema.prisma          # Database schema
├── public/                    # Static assets
└── scripts/                   # Build/deployment scripts
```

## 🔧 Available Scripts

### Development
```bash
npm run dev              # Start development server
npm run build            # Build production application
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Database
```bash
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema to database
npx prisma studio        # Open Prisma Studio
```

### Infrastructure
```bash
npm run build:lambda:all        # Build all Lambda functions
npm run cdk:synth               # Synthesize CDK stacks
npm run cdk:deploy              # Deploy all stacks
npm run cdk:deploy:websocket    # Deploy WebSocket stack
npm run cdk:deploy:notifications # Deploy notification stack
npm run cdk:deploy:chime        # Deploy Chime stack
npm run cdk:deploy:payments     # Deploy payment scheduler
npm run cdk:destroy             # Destroy all stacks
```

## 🔐 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL=mongodb://...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

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
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...
WEBSOCKET_API_ENDPOINT=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Email
RESEND_API_KEY=...

# Push Notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Geocoding
GEOCODING_API_KEY=...
```

## 📦 Key Features

### For Users
- ✅ User registration and authentication (email, Google, Apple, Facebook)
- ✅ Profile management with photo gallery
- ✅ Browse and search professionals
- ✅ Book appointments with calendar integration
- ✅ Real-time messaging with professionals
- ✅ Video sessions via Amazon Chime
- ✅ Secure payment processing with Stripe
- ✅ Merchandise store
- ✅ Community forum
- ✅ Reviews and ratings
- ✅ Push notifications
- ✅ Progressive Web App (PWA)

### For Professionals
- ✅ Professional application workflow
- ✅ Training video requirements
- ✅ Quiz-based onboarding
- ✅ Availability management
- ✅ Appointment proposals
- ✅ Earnings tracking
- ✅ Discount management
- ✅ Client messaging

### For Administrators
- ✅ User management
- ✅ Professional application review
- ✅ Booking and payment oversight
- ✅ Dispute resolution
- ✅ Content management (videos, merchandise)
- ✅ Report and feedback management
- ✅ System configuration
- ✅ Analytics dashboard

## 🔒 Security Features

- Password hashing with bcrypt
- Session-based authentication with NextAuth.js
- CSRF protection
- Rate limiting
- Account lockout after failed login attempts
- Email verification
- Secure password reset flow
- PCI compliance via Stripe
- Input validation with Zod
- XSS protection

## 🚢 Deployment

### Vercel (Recommended for Frontend)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### AWS Infrastructure
```bash
# Deploy all infrastructure
npm run deploy:all

# Or deploy specific stacks
npm run deploy:websocket
npm run deploy:notifications
```

### Database
- Use MongoDB Atlas for production
- Set up connection string in environment variables
- Run Prisma migrations

## 📊 Database Schema

The application uses MongoDB with Prisma ORM. Key models include:

- **User** - User accounts and profiles
- **Professional** - Professional profiles and settings
- **Appointment** - Booking records
- **Payment** - Payment transactions
- **Conversation** - Chat conversations
- **Message** - Chat messages
- **VideoSession** - Video call sessions
- **Post** - Forum posts
- **Review** - Professional reviews
- **Merchandise** - Product catalog
- **Order** - Purchase orders

See [Technical Documentation](./TECHNICAL_DOCUMENTATION.md) for complete schema details.

## 🎯 API Routes

The application provides RESTful APIs for all features:

- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/professionals/*` - Professional operations
- `/api/appointment/*` - Booking management
- `/api/messages/*` - Messaging
- `/api/video/*` - Video sessions
- `/api/payments/*` - Payment processing
- `/api/admin/*` - Admin operations

See [Technical Documentation](./TECHNICAL_DOCUMENTATION.md) for complete API reference.

## 🏗️ Infrastructure

### AWS Services Used

- **API Gateway** - WebSocket API for real-time messaging
- **Lambda** - Serverless functions for WebSocket, notifications, payments
- **DynamoDB** - WebSocket connection tracking
- **S3** - File storage (images, videos)
- **SNS** - Push notifications
- **SQS** - Message queuing
- **Chime SDK** - Video sessions
- **EventBridge** - Scheduled tasks

See [Technical Documentation](./TECHNICAL_DOCUMENTATION.md) for infrastructure details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary and confidential.

## 📧 Support

For support and questions, please contact the development team.

---

**Built with ❤️ using Next.js, React, and AWS**
