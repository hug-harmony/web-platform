// lib/validations/professionals.ts

import { z } from "zod";

export const professionalFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  venue: z.enum(["host", "visit", "both"]).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  gender: z.enum(["male", "female"]).optional(),
  minAge: z.coerce.number().min(18).max(100).optional(),
  maxAge: z.coerce.number().min(18).max(100).optional(),
  hasProfilePic: z.enum(["yes", "no"]).optional(),
  onlineStatus: z
    .enum(["24hrs", "1day", "1week", "1month", "1year"])
    .optional(),

  // Geo filters
  currentLat: z.coerce.number().min(-90).max(90).optional(),
  currentLng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(500).optional(),
  unit: z.enum(["km", "miles"]).optional(),

  // Availability
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  timeRangeStart: z.coerce.number().min(0).max(1440).optional(),
  timeRangeEnd: z.coerce.number().min(0).max(1440).optional(),

  // Sorting & Pagination
  sortBy: z.enum(["rating", "rate", "rate-desc", "name", "newest"]).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

export const professionalIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const availabilityQuerySchema = z.object({
  professionalId: professionalIdSchema,
  dayOfWeek: z.coerce.number().min(0).max(6),
});

export const bulkAvailabilityQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
});

export const updateAvailabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  slots: z.array(z.string()),
  breakDuration: z.union([z.literal(30), z.literal(60)]),
});

export type ProfessionalFiltersInput = z.infer<
  typeof professionalFiltersSchema
>;
