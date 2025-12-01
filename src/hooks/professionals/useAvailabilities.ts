// hooks/professionals/useAvailabilities.ts
import { useEffect, useState, useCallback } from "react";

interface AvailabilityData {
  slots: string[];
  breakDuration: number;
}

interface BulkAvailabilityResponse {
  date: string;
  dayOfWeek: number;
  availabilities: {
    professionalId: string;
    slots: string[];
    breakDuration: number;
  }[];
}

/**
 * Hook to fetch availability for a single professional on a specific date
 */
export function useAvailability(
  professionalId: string | undefined,
  selectedDate: Date | undefined
) {
  const [availability, setAvailability] = useState<AvailabilityData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!professionalId || !selectedDate) {
      setAvailability(null);
      return;
    }

    const fetchAvail = async () => {
      setLoading(true);
      setError(null);

      try {
        const dayOfWeek = selectedDate.getDay();
        const res = await fetch(
          `/api/professionals/availability?professionalId=${professionalId}&dayOfWeek=${dayOfWeek}`,
          { credentials: "include" }
        );

        if (res.ok) {
          const data = await res.json();
          setAvailability(data);
        } else {
          const errData = await res.json();
          setError(errData.error || "Failed to fetch availability");
          setAvailability(null);
        }
      } catch (err) {
        console.error("Error fetching availability:", err);
        setError("Network error");
        setAvailability(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAvail();
  }, [professionalId, selectedDate]);

  return { availability, loading, error };
}

/**
 * Hook to fetch availabilities for ALL professionals on a specific date
 * Uses the bulk endpoint for efficiency
 */
export function useAvailabilities(selectedDate: Date | undefined) {
  const [availabilities, setAvailabilities] = useState<
    Record<string, string[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailabilities = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);

    try {
      const dateStr = date.toISOString().split("T")[0]; // Format: YYYY-MM-DD
      const res = await fetch(
        `/api/professionals/availability/bulk?date=${dateStr}`,
        { credentials: "include" }
      );

      if (res.ok) {
        const data: BulkAvailabilityResponse = await res.json();

        // Convert to Record<professionalId, slots[]>
        const availMap: Record<string, string[]> = {};
        data.availabilities.forEach((a) => {
          availMap[a.professionalId] = a.slots;
        });

        setAvailabilities(availMap);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to fetch availabilities");
        setAvailabilities({});
      }
    } catch (err) {
      console.error("Error fetching bulk availabilities:", err);
      setError("Network error");
      setAvailabilities({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setAvailabilities({});
      return;
    }

    fetchAvailabilities(selectedDate);
  }, [selectedDate, fetchAvailabilities]);

  return { availabilities, loading, error, refetch: fetchAvailabilities };
}
