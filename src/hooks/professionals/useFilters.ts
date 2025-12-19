// hooks/professionals/useFilters.ts

import { useState, useCallback, useMemo } from "react";
import type { ProfessionalFilters } from "@/types/professional";

export interface Filters extends ProfessionalFilters {
  // UI-specific state
  selectedDate: Date | undefined;
  timeRange: [number, number];
  // Additional filter fields used by UI components
  type: "" | "user" | "professional";
  race: string;
  ethnicity: string;
  bodyType: string;
  personalityType: string;
}

const initialFilters: Filters = {
  search: undefined,
  location: undefined,
  minRating: undefined,
  sortBy: undefined,
  currentLat: undefined,
  currentLng: undefined,
  radius: undefined,
  unit: "miles",
  minAge: undefined,
  maxAge: undefined,
  gender: undefined,
  hasProfilePic: undefined,
  onlineStatus: undefined,
  venue: undefined,
  selectedDate: undefined,
  timeRange: [0, 1410],
  page: 1,
  limit: 50,
  // Additional fields
  type: "",
  race: "",
  ethnicity: "",
  bodyType: "",
  personalityType: "",
};

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);

  const reset = useCallback(() => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }, []);

  const removeFilter = useCallback((key: keyof Filters) => {
    const updateFn = (prev: Filters): Filters => {
      const updated = { ...prev };

      switch (key) {
        case "minAge":
        case "maxAge":
          updated.minAge = undefined;
          updated.maxAge = undefined;
          break;
        case "radius":
          updated.radius = undefined;
          updated.currentLat = undefined;
          updated.currentLng = undefined;
          updated.location = undefined;
          break;
        case "timeRange":
          updated.timeRange = [0, 1410];
          break;
        case "selectedDate":
          updated.selectedDate = undefined;
          updated.date = undefined;
          break;
        default:
          (updated as Record<string, unknown>)[key] = initialFilters[key];
      }

      return updated;
    };

    setFilters(updateFn);
    setAppliedFilters(updateFn);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    const f = appliedFilters;

    if (f.location) count++;
    if (f.radius && f.currentLat && f.currentLng) count++;
    if (f.gender) count++;
    if (f.minAge !== undefined || f.maxAge !== undefined) count++;
    if (f.selectedDate) count++;
    if (f.timeRange[0] !== 0 || f.timeRange[1] !== 1410) count++;
    if (f.hasProfilePic) count++;
    if (f.onlineStatus) count++;
    if (f.venue) count++;
    if (f.type) count++;
    if (f.minRating && f.minRating > 0) count++;

    return count;
  }, [appliedFilters]);

  const hasPendingChanges = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(appliedFilters);
  }, [filters, appliedFilters]);

  const hasActiveFilters = useMemo(() => {
    const f = appliedFilters;
    return !!(
      f.location ||
      f.radius ||
      f.gender ||
      f.minAge !== undefined ||
      f.maxAge !== undefined ||
      f.selectedDate ||
      f.timeRange[0] !== 0 ||
      f.timeRange[1] !== 1410 ||
      f.hasProfilePic ||
      f.onlineStatus ||
      f.venue ||
      f.type ||
      (f.minRating && f.minRating > 0)
    );
  }, [appliedFilters]);

  // Convert applied filters to API-compatible format
  const apiFilters = useMemo((): ProfessionalFilters => {
    const f = appliedFilters;
    return {
      search: f.search,
      location: f.location,
      venue: f.venue,
      minRating: f.minRating,
      gender: f.gender,
      minAge: f.minAge,
      maxAge: f.maxAge,
      hasProfilePic: f.hasProfilePic,
      onlineStatus: f.onlineStatus,
      currentLat: f.currentLat,
      currentLng: f.currentLng,
      radius: f.radius,
      unit: f.unit,
      date: f.selectedDate?.toISOString().split("T")[0],
      timeRangeStart: f.timeRange[0] !== 0 ? f.timeRange[0] : undefined,
      timeRangeEnd: f.timeRange[1] !== 1410 ? f.timeRange[1] : undefined,
      sortBy: f.sortBy,
      page: f.page,
      limit: f.limit,
    };
  }, [appliedFilters]);

  return {
    filters,
    setFilters,
    appliedFilters,
    setAppliedFilters,
    apiFilters,
    reset,
    removeFilter,
    activeFilterCount,
    hasPendingChanges,
    hasActiveFilters,
  };
}
