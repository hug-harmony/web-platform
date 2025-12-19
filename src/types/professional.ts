// types/professional.ts

export interface Professional {
  _id: string;
  name: string;
  image?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  rate?: number;
  biography?: string;
  createdAt?: string;
  venue?: "host" | "visit" | "both";
  lastOnline?: string | Date | null;
  ethnicity?: string;
  userId?: string;

  // Extended fields (optional, used for filtering)
  lat?: number;
  lng?: number;
  age?: number;
  gender?: "male" | "female" | "other";

  // Availability (when date filter is applied)
  availableSlots?: string[];
}

export interface ProfessionalDetail extends Professional {
  status?: string;
  applicationId?: string;
  photos?: { id: string; url: string }[];
  reviews?: {
    id: string;
    rating: number;
    feedback: string;
    createdAt: string;
    reviewer: { name: string; profileImage?: string };
  }[];
}

export interface ProfessionalFilters {
  search?: string;
  location?: string;
  venue?: "host" | "visit" | "both";
  minRating?: number;
  gender?: "male" | "female";
  minAge?: number;
  maxAge?: number;
  hasProfilePic?: "yes" | "no";
  onlineStatus?: "24hrs" | "1day" | "1week" | "1month" | "1year";

  // Geo filters
  currentLat?: number;
  currentLng?: number;
  radius?: number;
  unit?: "km" | "miles";

  // Availability filters
  date?: string; // YYYY-MM-DD format
  timeRangeStart?: number; // minutes from midnight
  timeRangeEnd?: number;

  // Sorting
  sortBy?: "rating" | "rate" | "rate-desc" | "name" | "newest";

  // Pagination
  page?: number;
  limit?: number;
}

export interface ProfessionalsResponse {
  professionals: Professional[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AvailabilitySlot {
  professionalId: string;
  slots: string[];
  breakDuration: number;
}

export interface BulkAvailabilityResponse {
  date: string;
  dayOfWeek: number;
  availabilities: AvailabilitySlot[];
}
