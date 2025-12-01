// types/professional.ts
export interface Professional {
  _id: string;
  name: string;
  image?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  rate?: number;
  role?: string;
  tags?: string;
  biography?: string;
  education?: string;
  license?: string;
  createdAt?: string;
  lat?: number;
  lng?: number;
  age?: number;
  gender?: "male" | "female" | "other";
  race?: string;
  ethnicity?: string;
  bodyType?: string;
  personalityType?: string;
  lastOnline?: string | Date | null;
  venue?: "host" | "visit" | "both";
  type?: "user" | "professional";
}

// Keep backward compatibility alias (can remove later)
export type Therapist = Professional;
