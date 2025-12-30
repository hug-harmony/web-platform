// lib/services/professionals.ts

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type {
  Professional,
  ProfessionalDetail,
  ProfessionalFilters,
  ProfessionalsResponse,
} from "@/types/professional";

// Online status thresholds in milliseconds
const ONLINE_THRESHOLDS: Record<string, number> = {
  "24hrs": 24 * 60 * 60 * 1000,
  "1day": 24 * 60 * 60 * 1000,
  "1week": 7 * 24 * 60 * 60 * 1000,
  "1month": 30 * 24 * 60 * 60 * 1000,
  "1year": 365 * 24 * 60 * 60 * 1000,
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Convert time slot string to minutes from midnight
 */
function timeToMinutes(slot: string): number {
  const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Convert slot time string to Date object
 */
function slotToDate(slot: string, baseDate: Date): Date {
  const minutes = timeToMinutes(slot);
  const result = new Date(baseDate);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

interface GetProfessionalsOptions {
  filters: ProfessionalFilters;
  excludeUserId?: string;
  includeAvailability?: boolean;
}

/**
 * Get list of professionals with filtering, sorting, and pagination
 */
export async function getProfessionals(
  options: GetProfessionalsOptions
): Promise<ProfessionalsResponse> {
  const { filters, excludeUserId, includeAvailability = false } = options;
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  // Build Prisma where clause
  const where: Prisma.ProfessionalWhereInput = {};

  // Exclude self if user is a professional
  if (excludeUserId) {
    const userApplication = await prisma.professionalApplication.findFirst({
      where: { userId: excludeUserId, status: "APPROVED" },
      select: { professionalId: true },
    });

    if (userApplication?.professionalId) {
      where.id = { not: userApplication.professionalId };
    }
  }

  // Search filter (name or biography)
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { biography: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Venue filter
  if (filters.venue && filters.venue !== "both") {
    where.venue = { in: [filters.venue, "both"] };
  }

  // Rating filter
  if (filters.minRating && filters.minRating > 0) {
    where.rating = { gte: filters.minRating };
  }

  // Build orderBy
  let orderBy: Prisma.ProfessionalOrderByWithRelationInput = {
    createdAt: "desc",
  };

  switch (filters.sortBy) {
    case "rating":
      orderBy = { rating: "desc" };
      break;
    case "rate":
      orderBy = { rate: "asc" };
      break;
    case "rate-desc":
      orderBy = { rate: "desc" };
      break;
    case "name":
      orderBy = { name: "asc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
  }

  // Fetch professionals with related data
  const professionals = await prisma.professional.findMany({
    where,
    select: {
      id: true,
      name: true,
      image: true,
      rating: true,
      reviewCount: true,
      rate: true,
      biography: true,
      createdAt: true,
      venue: true,
      location: true,
      applications: {
        select: {
          userId: true,
          user: {
            select: {
              location: true,
              lastOnline: true,
              ethnicity: true,
              profileImage: true,
            },
          },
        },
      },
    },
    orderBy,
  });

  // Transform to Professional type
  let results: Professional[] = professionals.map((p) => ({
    _id: p.id,
    name: p.name,
    image: p.applications?.[0]?.user?.profileImage || p.image || undefined,
    location: p.location || p.applications?.[0]?.user?.location || undefined,
    rating: p.rating || undefined,
    reviewCount: p.reviewCount || undefined,
    rate: p.rate || undefined,
    biography: p.biography || undefined,
    createdAt: p.createdAt?.toISOString(),
    venue: p.venue || undefined,
    lastOnline:
      p.applications?.[0]?.user?.lastOnline?.toISOString() || undefined,
    ethnicity: p.applications?.[0]?.user?.ethnicity || undefined,
    userId: p.applications?.[0]?.userId || undefined,
  }));

  // Apply post-query filters that can't be done in Prisma

  // Location filter (exact match, not geo)
  if (
    filters.location &&
    filters.location !== "Custom Location" &&
    filters.location !== "Current Location"
  ) {
    results = results.filter((p) => p.location === filters.location);
  }

  // Geo/radius filter
  if (filters.currentLat && filters.currentLng && filters.radius) {
    const radiusKm =
      filters.unit === "miles" ? filters.radius * 1.60934 : filters.radius;

    results = results.filter((p) => {
      if (!p.lat || !p.lng) return false;
      const distance = calculateDistance(
        filters.currentLat!,
        filters.currentLng!,
        p.lat,
        p.lng
      );
      return distance <= radiusKm;
    });
  }

  // Online status filter
  if (filters.onlineStatus) {
    const threshold = ONLINE_THRESHOLDS[filters.onlineStatus];
    if (threshold) {
      const now = Date.now();
      results = results.filter((p) => {
        if (!p.lastOnline) return false;
        const lastOnlineTime = new Date(p.lastOnline).getTime();
        return now - lastOnlineTime <= threshold;
      });
    }
  }

  // Profile picture filter
  if (filters.hasProfilePic === "yes") {
    results = results.filter((p) => !!p.image);
  } else if (filters.hasProfilePic === "no") {
    results = results.filter((p) => !p.image);
  }

  // Availability filter (when date is provided)
  if (includeAvailability && filters.date) {
    const availabilityMap = await getBulkAvailability(filters.date);

    results = results.map((p) => ({
      ...p,
      availableSlots: availabilityMap[p._id] || [],
    }));

    // Filter by time range if specified
    if (
      filters.timeRangeStart !== undefined ||
      filters.timeRangeEnd !== undefined
    ) {
      const startMins = filters.timeRangeStart ?? 0;
      const endMins = filters.timeRangeEnd ?? 1440;

      results = results.filter((p) => {
        if (!p.availableSlots || p.availableSlots.length === 0) return false;

        return p.availableSlots.some((slot) => {
          const slotMins = timeToMinutes(slot);
          return slotMins >= startMins && slotMins <= endMins;
        });
      });
    }

    // Filter out professionals with no availability
    results = results.filter(
      (p) => p.availableSlots && p.availableSlots.length > 0
    );
  }

  // Race filter
  if (filters.race) {
    results = results.filter((p) => p.race === filters.race);
  }

  // Ethnicity filter
  if (filters.ethnicity) {
    results = results.filter((p) => p.ethnicity === filters.ethnicity);
  }

  // Body Type filter
  if (filters.bodyType) {
    results = results.filter((p) => p.bodyType === filters.bodyType);
  }

  // Personality Type filter
  if (filters.personalityType) {
    results = results.filter(
      (p) => p.personalityType === filters.personalityType
    );
  }

  // Apply pagination after all filters
  const total = results.length;
  const paginatedResults = results.slice(skip, skip + limit);

  return {
    professionals: paginatedResults,
    total,
    page,
    limit,
    hasMore: skip + limit < total,
  };
}

/**
 * Get a single professional by ID
 */
export async function getProfessionalById(
  id: string
): Promise<ProfessionalDetail | null> {
  const professional = await prisma.professional.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      rating: true,
      reviewCount: true,
      rate: true,
      biography: true,
      createdAt: true,
      venue: true,
      location: true,
      applications: {
        select: {
          id: true,
          status: true,
          userId: true,
          user: {
            select: {
              location: true,
              lastOnline: true,
              ethnicity: true,
              profileImage: true,
              photos: {
                select: { id: true, url: true },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
      reviews: {
        select: {
          id: true,
          rating: true,
          feedback: true,
          createdAt: true,
          reviewer: {
            select: {
              name: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!professional) return null;

  return {
    _id: professional.id,
    name: professional.name,
    image:
      professional.applications?.[0]?.user?.profileImage ||
      professional.image ||
      undefined,
    location:
      professional.location ||
      professional.applications?.[0]?.user?.location ||
      undefined,
    rating: professional.rating || undefined,
    reviewCount: professional.reviewCount || undefined,
    rate: professional.rate || undefined,
    biography: professional.biography || undefined,
    createdAt: professional.createdAt?.toISOString(),
    venue: professional.venue || undefined,
    lastOnline:
      professional.applications?.[0]?.user?.lastOnline?.toISOString() ||
      undefined,
    ethnicity: professional.applications?.[0]?.user?.ethnicity || undefined,
    userId: professional.applications?.[0]?.userId || undefined,
    status: professional.applications?.[0]?.status || undefined,
    applicationId: professional.applications?.[0]?.id || undefined,
    photos: professional.applications?.[0]?.user?.photos || [],
    reviews: professional.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      feedback: r.feedback,
      createdAt: r.createdAt.toISOString(),
      reviewer: {
        name: r.reviewer.name || "Anonymous",
        profileImage: r.reviewer.profileImage || undefined,
      },
    })),
  };
}

/**
 * Get bulk availability for all professionals on a specific date
 */
export async function getBulkAvailability(
  dateStr: string
): Promise<Record<string, string[]>> {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date format");
  }

  const dayOfWeek = date.getDay();

  // Fetch all availability records for this day
  const availabilities = await prisma.availability.findMany({
    where: { dayOfWeek },
    select: {
      professionalId: true,
      slots: true,
    },
  });

  // Fetch booked appointments for this date
  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: startOfDay, lte: endOfDay },
      status: { in: ["upcoming", "pending", "break"] },
    },
    select: {
      professionalId: true,
      startTime: true,
      endTime: true,
    },
  });

  // Group booked times by professional
  const bookedByProfessional: Record<string, { start: Date; end: Date }[]> = {};
  bookedAppointments.forEach((appt) => {
    if (!bookedByProfessional[appt.professionalId]) {
      bookedByProfessional[appt.professionalId] = [];
    }
    bookedByProfessional[appt.professionalId].push({
      start: appt.startTime,
      end: appt.endTime,
    });
  });

  // Build availability map excluding booked slots
  const availabilityMap: Record<string, string[]> = {};

  availabilities.forEach((avail) => {
    const booked = bookedByProfessional[avail.professionalId] || [];

    const availableSlots = avail.slots.filter((slot) => {
      const slotStart = slotToDate(slot, startOfDay);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

      return !booked.some((b) => slotStart < b.end && slotEnd > b.start);
    });

    availabilityMap[avail.professionalId] = availableSlots;
  });

  return availabilityMap;
}

/**
 * Get availability for a single professional on a specific day
 */
export async function getProfessionalAvailability(
  professionalId: string,
  dayOfWeek: number
): Promise<{ slots: string[]; breakDuration: number }> {
  const avail = await prisma.availability.findUnique({
    where: {
      professionalId_dayOfWeek: { professionalId, dayOfWeek },
    },
  });

  return {
    slots: avail?.slots ?? [],
    breakDuration: avail?.breakDuration ?? 30,
  };
}

/**
 * Update availability for a professional
 */
export async function updateProfessionalAvailability(
  professionalId: string,
  dayOfWeek: number,
  slots: string[],
  breakDuration: number
): Promise<void> {
  const existing = await prisma.availability.findFirst({
    where: { professionalId, dayOfWeek },
  });

  if (existing) {
    await prisma.availability.update({
      where: { id: existing.id },
      data: { slots, breakDuration },
    });
  } else {
    await prisma.availability.create({
      data: { professionalId, dayOfWeek, slots, breakDuration },
    });
  }
}

/**
 * Get all unique locations from professionals
 */
export async function getUniqueLocations(): Promise<string[]> {
  const [professionalLocations, userLocations] = await Promise.all([
    prisma.professional.findMany({
      where: { location: { not: null } },
      select: { location: true },
      distinct: ["location"],
    }),
    prisma.user.findMany({
      where: {
        location: { not: null },
        professionalApplication: {
          status: "APPROVED",
        },
      },
      select: { location: true },
      distinct: ["location"],
    }),
  ]);

  const allLocations = new Set<string>();

  professionalLocations.forEach((p) => {
    if (p.location) allLocations.add(p.location);
  });

  userLocations.forEach((u) => {
    if (u.location) allLocations.add(u.location);
  });

  return Array.from(allLocations).sort();
}
