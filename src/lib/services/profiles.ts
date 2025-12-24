// lib/services/profiles.ts

import prisma from "@/lib/prisma";
import type {
  Profile,
  UserProfile,
  ProfessionalProfile,
  ProfileReview,
  ProfileDiscount,
} from "@/types/profile";

/**
 * Get a profile by ID - automatically detects if it's a user or professional
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  // First, try to find as a professional
  const professional = await getProfessionalProfile(id);
  if (professional) {
    return professional;
  }

  // If not found, try to find as a user
  const user = await getUserProfile(id);
  if (user) {
    return user;
  }

  return null;
}

/**
 * Get a professional profile by ID
 */
export async function getProfessionalProfile(
  id: string
): Promise<ProfessionalProfile | null> {
  const professional = await prisma.professional.findUnique({
    where: { id },
    include: {
      applications: {
        where: { status: "APPROVED" },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              lastOnline: true,
              profileImage: true,
              relationshipStatus: true,
              orientation: true,
              height: true,
              ethnicity: true,
              zodiacSign: true,
              favoriteColor: true,
              favoriteMedia: true,
              petOwnership: true,
              biography: true,
              photos: {
                select: { id: true, url: true },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
        take: 1,
      },
      reviews: {
        select: {
          id: true,
          rating: true,
          feedback: true,
          createdAt: true,
          reviewer: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      discounts: {
        select: {
          id: true,
          name: true,
          rate: true,
          discount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!professional) {
    return null;
  }

  const user = professional.applications?.[0]?.user;

  return {
    id: professional.id,
    type: "professional",
    name: professional.name,
    image: user?.profileImage || professional.image || undefined,
    location: professional.location || undefined,
    biography: professional.biography || user?.biography || undefined,
    lastOnline: user?.lastOnline || undefined,
    createdAt: professional.createdAt?.toISOString(),

    // Personal info from linked user
    relationshipStatus: user?.relationshipStatus || undefined,
    orientation: user?.orientation || undefined,
    height: user?.height || undefined,
    ethnicity: user?.ethnicity || undefined,
    zodiacSign: user?.zodiacSign || undefined,
    favoriteColor: user?.favoriteColor || undefined,
    favoriteMedia: user?.favoriteMedia || undefined,
    petOwnership: user?.petOwnership || undefined,

    // Photos from linked user
    photos: user?.photos || [],

    // Professional-specific
    rate: professional.rate || undefined,
    rating: professional.rating || undefined,
    reviewCount: professional.reviewCount || undefined,
    venue: professional.venue || undefined,
    userId: professional.applications?.[0]?.userId || undefined,

    // Reviews
    reviews: professional.reviews.map(
      (r): ProfileReview => ({
        id: r.id,
        rating: r.rating,
        feedback: r.feedback,
        reviewerName:
          r.reviewer.name ||
          `${r.reviewer.firstName || ""} ${r.reviewer.lastName || ""}`.trim() ||
          "Anonymous",
        reviewerId: r.reviewer.id,
        createdAt: r.createdAt.toISOString(),
      })
    ),

    // Discounts
    discounts: professional.discounts.map(
      (d): ProfileDiscount => ({
        id: d.id,
        name: d.name,
        rate: d.rate,
        discount: d.discount,
        createdAt: d.createdAt?.toISOString(),
        updatedAt: d.updatedAt?.toISOString(),
      })
    ),
  };
}

/**
 * Get a user profile by ID
 */
export async function getUserProfile(id: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      name: true,
      profileImage: true,
      location: true,
      biography: true,
      lastOnline: true,
      createdAt: true,
      relationshipStatus: true,
      orientation: true,
      height: true,
      ethnicity: true,
      zodiacSign: true,
      favoriteColor: true,
      favoriteMedia: true,
      petOwnership: true,
      photos: {
        select: {
          id: true,
          url: true,
        },
        orderBy: { createdAt: "desc" },
      },
      professionalApplication: {
        select: {
          status: true,
          professionalId: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    type: "user",
    name:
      user.name ||
      (user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : "Unknown User"),
    image: user.profileImage || undefined,
    location: user.location || undefined,
    biography: user.biography || undefined,
    lastOnline: user.lastOnline || undefined,
    createdAt: user.createdAt?.toISOString(),

    // Personal info
    relationshipStatus: user.relationshipStatus || undefined,
    orientation: user.orientation || undefined,
    height: user.height || undefined,
    ethnicity: user.ethnicity || undefined,
    zodiacSign: user.zodiacSign || undefined,
    favoriteColor: user.favoriteColor || undefined,
    favoriteMedia: user.favoriteMedia || undefined,
    petOwnership: user.petOwnership || undefined,

    // Photos
    photos: user.photos || [],

    // User-specific
    email: user.email,
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    professionalApplication: user.professionalApplication
      ? {
          status: user.professionalApplication.status,
          professionalId: user.professionalApplication.professionalId,
        }
      : null,
  };
}

/**
 * Record a profile visit
 */
export async function recordProfileVisit(
  visitorId: string,
  targetId: string,
  targetType: "user" | "professional"
): Promise<void> {
  // Don't record self-visits
  if (visitorId === targetId) {
    return;
  }

  await prisma.profileVisit.create({
    data: {
      userId: visitorId,
      ...(targetType === "professional"
        ? { professionalId: targetId }
        : { visitedUserId: targetId }),
    },
  });
}

/**
 * Get the user ID for messaging from a profile
 * For professionals, this returns the linked user ID
 * For users, this returns the user ID directly
 */
export async function getMessagingUserId(
  profileId: string,
  profileType: "user" | "professional"
): Promise<string | null> {
  if (profileType === "user") {
    return profileId;
  }

  // For professionals, get the linked user ID
  const application = await prisma.professionalApplication.findFirst({
    where: { professionalId: profileId },
    select: { userId: true },
  });

  return application?.userId || null;
}
