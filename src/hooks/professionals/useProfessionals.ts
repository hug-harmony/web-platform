/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/professionals/useProfessionals.ts
import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { Professional } from "@/types/professional";

export function useProfessionals(searchQuery: string, appliedFilters: any) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfessionals = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();

        if (searchQuery) {
          queryParams.append("search", searchQuery);
        }

        // Add filter parameters
        Object.entries(appliedFilters).forEach(([key, value]) => {
          if (
            value !== undefined &&
            value !== "" &&
            value !== null &&
            key !== "availabilities" // Don't send availabilities object
          ) {
            if (key === "selectedDate" && value instanceof Date) {
              queryParams.append(key, value.toISOString());
            } else if (key === "timeRange" && Array.isArray(value)) {
              queryParams.append("timeRangeStart", String(value[0]));
              queryParams.append("timeRangeEnd", String(value[1]));
            } else {
              queryParams.append(key, String(value));
            }
          }
        });

        const res = await fetch(`/api/professionals?${queryParams}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) {
            redirect("/login");
          }
          throw new Error(`Failed to fetch professionals: ${res.statusText}`);
        }

        const { professionals: data } = await res.json();

        const formatted: Professional[] = (data || [])
          .filter((p: any) => p.id)
          .map((p: any) => ({
            _id: p.id,
            name: p.name,
            image: p.image ?? "",
            location: p.location ?? "",
            rating: p.rating ?? 0,
            reviewCount: p.reviewCount ?? 0,
            rate: p.rate ?? 0,
            role: p.role ?? "",
            tags: p.tags ?? "",
            biography: p.biography ?? "",
            education: p.education ?? "",
            license: p.license ?? "",
            createdAt: p.createdAt,
            lat: p.lat,
            lng: p.lng,
            age: p.age,
            gender: p.gender,
            race: p.race ?? "",
            ethnicity: p.ethnicity ?? "",
            bodyType: p.bodyType ?? "",
            personalityType: p.personalityType ?? "",
            lastOnline: p.lastOnline,
            venue: p.venue ?? "",
            type: p.type ?? "professional",
          }));

        setProfessionals(formatted);
      } catch (err: any) {
        console.error("Error fetching professionals:", err);
        setError(err.message || "Failed to fetch professionals");
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, [searchQuery, appliedFilters]);

  return { professionals, loading, error };
}
