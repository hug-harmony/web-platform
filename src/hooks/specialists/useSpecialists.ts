/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useSpecialists.ts
import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { Therapist } from "@/types/therapist";

export function useSpecialists(searchQuery: string, appliedFilters: any) {
  const [specialists, setSpecialists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecialists = async () => {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      Object.entries(appliedFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== null) {
          queryParams.append(k, String(v));
        }
      });

      const res = await fetch(`/api/specialists?${queryParams}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) redirect("/login");
        throw new Error("Failed");
      }
      const { specialists } = await res.json();
      setSpecialists(
        (specialists || [])
          .filter((s: any) => s.id)
          .map((s: any) => ({
            _id: s.id,
            name: s.name,
            image: s.image ?? "",
            location: s.location ?? "",
            rating: s.rating ?? 0,
            reviewCount: s.reviewCount ?? 0,
            rate: s.rate ?? 0,
            role: s.role ?? "",
            tags: s.tags ?? "",
            biography: s.biography ?? "",
            education: s.education ?? "",
            license: s.license ?? "",
            createdAt: s.createdAt,
            lat: s.lat,
            lng: s.lng,
            age: s.age,
            gender: s.gender,
            race: s.race ?? "",
            ethnicity: s.ethnicity ?? "",
            bodyType: s.bodyType ?? "",
            personalityType: s.personalityType ?? "",
            lastOnline: s.lastOnline,
            venue: s.venue ?? "",
            type: s.type ?? "professional",
          }))
      );
      setLoading(false);
    };
    fetchSpecialists();
  }, [searchQuery, appliedFilters]);

  return { specialists, loading };
}
