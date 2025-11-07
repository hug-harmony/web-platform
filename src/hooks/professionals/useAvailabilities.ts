/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useAvailabilities.ts
import { useEffect, useState } from "react";

export function useAvailabilities(selectedDate: Date | undefined) {
  const [availabilities, setAvailabilities] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    if (!selectedDate) {
      setAvailabilities({});
      return;
    }
    const fetchAvail = async () => {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const res = await fetch(`/api/specialists/availability?date=${dateStr}`, {
        credentials: "include",
      });
      if (res.ok) {
        const { availabilities } = await res.json();
        setAvailabilities(
          availabilities.reduce(
            (acc: any, { specialistId, slots }: any) => ({
              ...acc,
              [specialistId]: slots,
            }),
            {}
          )
        );
      }
    };
    fetchAvail();
  }, [selectedDate]);

  return availabilities;
}
