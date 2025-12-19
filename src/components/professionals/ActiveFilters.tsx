// components/professionals/ActiveFilters.tsx

"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Filters } from "@/hooks/professionals/useFilters";

interface ActiveFiltersProps {
  filters: Filters;
  onRemove: (key: keyof Filters) => void;
}

export function ActiveFilters({ filters, onRemove }: ActiveFiltersProps) {
  const activeFilters = useMemo(() => {
    const chips: { key: keyof Filters; label: string }[] = [];

    if (filters.location && filters.location !== "Custom Location") {
      chips.push({ key: "location", label: filters.location });
    }

    if (filters.radius && filters.currentLat && filters.currentLng) {
      chips.push({
        key: "radius",
        label: `Within ${filters.radius} ${filters.unit}`,
      });
    }

    if (filters.gender) {
      chips.push({
        key: "gender",
        label: filters.gender.charAt(0).toUpperCase() + filters.gender.slice(1),
      });
    }

    if (filters.minAge !== undefined || filters.maxAge !== undefined) {
      const min = filters.minAge ?? 0;
      const max = filters.maxAge ?? "∞";
      chips.push({ key: "minAge", label: `Age: ${min}-${max}` });
    }

    if (filters.selectedDate) {
      chips.push({
        key: "selectedDate",
        label: filters.selectedDate.toLocaleDateString(),
      });
    }

    if (filters.timeRange[0] !== 0 || filters.timeRange[1] !== 1410) {
      const formatTime = (mins: number) => {
        const h = Math.floor(mins / 60) % 24;
        const m = mins % 60;
        const period = h >= 12 ? "PM" : "AM";
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, "0")} ${period}`;
      };
      chips.push({
        key: "timeRange",
        label: `${formatTime(filters.timeRange[0])} - ${formatTime(filters.timeRange[1])}`,
      });
    }

    if (filters.hasProfilePic) {
      chips.push({
        key: "hasProfilePic",
        label: filters.hasProfilePic === "yes" ? "With Photo" : "Without Photo",
      });
    }

    if (filters.onlineStatus) {
      chips.push({
        key: "onlineStatus",
        label: `Online: ${filters.onlineStatus}`,
      });
    }

    if (filters.venue) {
      chips.push({
        key: "venue",
        label: `Venue: ${filters.venue}`,
      });
    }

    if (filters.type) {
      chips.push({
        key: "type",
        label: filters.type.charAt(0).toUpperCase() + filters.type.slice(1),
      });
    }

    if (filters.minRating !== undefined && filters.minRating > 0) {
      chips.push({
        key: "minRating",
        label: `Rating: ${filters.minRating}+`,
      });
    }

    return chips;
  }, [filters]);

  if (activeFilters.length === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-2"
      role="list"
      aria-label="Active filters"
    >
      {activeFilters.map(({ key, label }) => (
        <Badge
          key={key}
          variant="secondary"
          className="flex items-center gap-1 cursor-pointer hover:bg-destructive/20 transition-colors"
          onClick={() => onRemove(key)}
          role="listitem"
          aria-label={`Remove filter: ${label}`}
        >
          {label}
          <X className="h-3 w-3" aria-hidden="true" />
        </Badge>
      ))}
    </div>
  );
}
