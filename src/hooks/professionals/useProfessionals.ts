// hooks/professionals/useProfessionals.ts

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Professional, ProfessionalFilters } from "@/types/professional";

interface UseProfessionalsResult {
  professionals: Professional[];
  locations: string[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  refetch: () => void;
}

export function useProfessionals(
  filters: ProfessionalFilters,
  options?: { includeLocations?: boolean }
): UseProfessionalsResult {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchProfessionals = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      // Add all filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== null) {
          if (key === "selectedDate" && value instanceof Date) {
            // Convert to YYYY-MM-DD format
            queryParams.append("date", value.toISOString().split("T")[0]);
          } else if (key === "timeRange" && Array.isArray(value)) {
            queryParams.append("timeRangeStart", String(value[0]));
            queryParams.append("timeRangeEnd", String(value[1]));
          } else if (typeof value !== "object") {
            queryParams.append(key, String(value));
          }
        }
      });

      // Include locations on first load
      if (options?.includeLocations) {
        queryParams.append("includeLocations", "true");
      }

      const res = await fetch(`/api/professionals?${queryParams}`, {
        credentials: "include",
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(`Failed to fetch professionals: ${res.statusText}`);
      }

      const data = await res.json();

      const formatted: Professional[] = (data.professionals || []).map(
        (p: Record<string, unknown>) => ({
          _id: p.id as string,
          name: p.name as string,
          image: (p.image as string) ?? undefined,
          location: (p.location as string) ?? undefined,
          rating: (p.rating as number) ?? undefined,
          reviewCount: (p.reviewCount as number) ?? undefined,
          rate: (p.rate as number) ?? undefined,
          biography: (p.biography as string) ?? undefined,
          createdAt: p.createdAt as string,
          venue: p.venue as "host" | "visit" | "both" | undefined,
          lastOnline: p.lastOnline as string | undefined,
          ethnicity: (p.ethnicity as string) ?? undefined,
          userId: p.userId as string | undefined,
          availableSlots: p.availableSlots as string[] | undefined,
        })
      );

      setProfessionals(formatted);
      setTotal(data.total || formatted.length);
      setHasMore(data.hasMore || false);

      if (data.locations) {
        setLocations(data.locations);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore abort errors
      }

      console.error("Error fetching professionals:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch professionals"
      );
    } finally {
      setLoading(false);
    }
  }, [filters, options?.includeLocations, router]);

  useEffect(() => {
    fetchProfessionals();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProfessionals]);

  return {
    professionals,
    locations,
    loading,
    error,
    total,
    hasMore,
    refetch: fetchProfessionals,
  };
}
