/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "use-debounce";
import { LocationResult } from "@/types/edit-profile";

export function useLocationSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm] = useDebounce(searchTerm, 300);
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7&lang=en`
      );
      if (!res.ok) throw new Error("Search unavailable");
      const data = await res.json();

      const results = (data.features || [])
        .map((f: any) => {
          const p = f.properties || {};
          const c = f.geometry?.coordinates || [];
          const name = p.name || p.street || p.city || "Location";
          return {
            lat: c[1]?.toString() || "0",
            lon: c[0]?.toString() || "0",
            display_name: p.country ? `${name}, ${p.country}` : name,
          };
        })
        .filter((r: LocationResult) => r.lat && r.lon)
        .slice(0, 7);

      setSuggestions(results);
    } catch {
      setError("Search failed");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions(debouncedTerm);
  }, [debouncedTerm, fetchSuggestions]);

  return { searchTerm, setSearchTerm, suggestions, loading, error, setError };
}
