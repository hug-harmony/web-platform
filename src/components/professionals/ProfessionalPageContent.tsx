// components/professionals/ProfessionalPageContent.tsx
"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { useProfessionals } from "@/hooks/professionals/useProfessionals";
import { useFilters } from "@/hooks/professionals/useFilters";
import { useAvailabilities } from "@/hooks/professionals/useAvailabilities";
import { useMediaQuery } from "@/hooks/professionals/useMediaQuery";
import { useKeyboardShortcut } from "@/hooks/professionals/useKeyboardShortcut";
import { SearchBar } from "@/components/professionals/SearchBar";
import { FilterAccordion } from "@/components/professionals/FilterAccordion";
import { ProfessionalsGrid } from "@/components/professionals/ProfessionalsGrid";
import { RadiusDialog } from "@/components/professionals/RadiusDialog";
import { DateTimeDialog } from "@/components/professionals/DateTimeDialog";
import { ActiveFilters } from "@/components/professionals/ActiveFilters";
import { MobileFilterSheet } from "@/components/professionals/MobileFilterSheet";
import { filterAndSort } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.2 } },
};

const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
};

export default function ProfessionalPageContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const {
    filters,
    setFilters,
    appliedFilters,
    setAppliedFilters,
    reset,
    removeFilter,
    activeFilterCount,
    hasPendingChanges,
    hasActiveFilters,
  } = useFilters();

  const [isRadiusDialogOpen, setIsRadiusDialogOpen] = useState(false);
  const [isDateTimeDialogOpen, setIsDateTimeDialogOpen] = useState(false);
  const [tempRadius, setTempRadius] = useState(10);
  const [tempUnit, setTempUnit] = useState<"km" | "miles">("miles");
  const [tempLat, setTempLat] = useState<number | undefined>();
  const [tempLng, setTempLng] = useState<number | undefined>();
  const [tempLocation, setTempLocation] = useState<string>("");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Fetch professionals
  const { professionals, loading } = useProfessionals(
    searchQuery,
    appliedFilters
  );

  // Fetch bulk availabilities when date is selected
  const { availabilities, loading: availLoading } = useAvailabilities(
    appliedFilters.selectedDate
  );

  // Get unique locations for filter dropdown
  const locations = useMemo(() => {
    return Array.from(
      new Set(professionals.map((p) => p.location).filter(Boolean))
    ) as string[];
  }, [professionals]);

  // Keyboard shortcut to focus search
  useKeyboardShortcut(
    "/",
    useCallback(() => {
      searchInputRef.current?.focus();
    }, []),
    { preventDefault: true }
  );

  const handleCustomLocation = () => {
    setTempRadius(filters.radius || 10);
    setTempLat(filters.currentLat);
    setTempLng(filters.currentLng);
    setTempLocation(filters.location || "");
    setFilters((prev) => ({
      ...prev,
      location: "Custom Location",
    }));
    setIsRadiusDialogOpen(true);
  };

  const applyRadius = () => {
    setFilters((prev) => ({
      ...prev,
      radius: tempRadius,
      unit: tempUnit,
      currentLat: tempLat,
      currentLng: tempLng,
      location: tempLocation || "Custom Location",
    }));
    setIsRadiusDialogOpen(false);
  };

  const applyDateTime = () => {
    setIsDateTimeDialogOpen(false);
  };

  // Apply ALL filters when Search is clicked
  const handleSearch = () => {
    setAppliedFilters(filters);
  };

  // Clear everything
  const handleClear = () => {
    setSearchQuery("");
    reset();
  };

  // Clear just the search text
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // Filter and sort using appliedFilters + availabilities
  const filtered = useMemo(() => {
    // Add availabilities to filters for the filterAndSort function
    const filtersWithAvailabilities = {
      ...appliedFilters,
      availabilities,
    };
    return filterAndSort(professionals, filtersWithAvailabilities, searchQuery);
  }, [professionals, appliedFilters, availabilities, searchQuery]);

  // Get pending date/time for button display
  const { selectedDate, timeRange } = filters;

  // Check if date filter has pending changes
  const hasDatePendingChanges =
    selectedDate !== appliedFilters.selectedDate ||
    timeRange[0] !== appliedFilters.timeRange[0] ||
    timeRange[1] !== appliedFilters.timeRange[1];

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Professional Directory
          </CardTitle>
          <p className="text-sm opacity-80">
            Find and connect with certified professionals
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <SearchBar
            ref={searchInputRef}
            searchQuery={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            onApply={handleSearch}
            onClear={handleClear}
            onClearSearch={handleClearSearch}
            hasPendingChanges={hasPendingChanges}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Mobile Filter Sheet */}
          {isMobile ? (
            <MobileFilterSheet
              filters={filters}
              locations={locations}
              activeFilterCount={activeFilterCount}
              onFilterChange={(k, v) =>
                setFilters((prev) => ({ ...prev, [k]: v }))
              }
              onCustomLocation={handleCustomLocation}
              onApplyFilters={handleSearch}
              onClearFilters={handleClear}
            />
          ) : (
            <FilterAccordion
              filters={filters}
              locations={locations}
              onFilterChange={(k, v) =>
                setFilters((prev) => ({ ...prev, [k]: v }))
              }
              onCustomLocation={handleCustomLocation}
            />
          )}

          {/* Date/Time Filter Button */}
          <Button
            variant="outline"
            onClick={() => setIsDateTimeDialogOpen(true)}
            className={cn(
              "border-[#F3CFC6] text-black dark:text-white hover:bg-[#F3CFC6]/20 relative",
              hasDatePendingChanges && "ring-2 ring-amber-400"
            )}
            aria-label="Filter by availability"
          >
            <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            {selectedDate ? (
              <span className="flex items-center gap-2">
                {selectedDate.toLocaleDateString()} •{" "}
                {minutesToTime(timeRange[0])} - {minutesToTime(timeRange[1])}
                {hasDatePendingChanges && (
                  <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-medium">
                    pending
                  </span>
                )}
              </span>
            ) : (
              "Filter by Availability"
            )}
            {availLoading && appliedFilters.selectedDate && (
              <span className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
          </Button>

          {/* Active Filters Summary */}
          <ActiveFilters filters={appliedFilters} onRemove={removeFilter} />
        </CardContent>
      </Card>

      <ProfessionalsGrid
        loading={loading || availLoading}
        professionals={filtered}
        hasActiveFilters={hasActiveFilters || !!searchQuery}
        onClearFilters={handleClear}
      />

      <RadiusDialog
        open={isRadiusDialogOpen}
        onOpenChange={setIsRadiusDialogOpen}
        tempLat={tempLat}
        tempLng={tempLng}
        tempLocation={tempLocation}
        tempRadius={tempRadius}
        tempUnit={tempUnit}
        onTempLatChange={setTempLat}
        onTempLngChange={setTempLng}
        onTempLocationChange={setTempLocation}
        onTempRadiusChange={setTempRadius}
        onTempUnitChange={setTempUnit}
        onApply={applyRadius}
      />

      <DateTimeDialog
        open={isDateTimeDialogOpen}
        onOpenChange={setIsDateTimeDialogOpen}
        selectedDate={selectedDate}
        onDateSelect={(date) =>
          setFilters((prev) => ({ ...prev, selectedDate: date }))
        }
        onApply={applyDateTime}
        timeRange={timeRange}
        setTimeRange={(range) =>
          setFilters((prev) => ({ ...prev, timeRange: range }))
        }
      />
    </motion.div>
  );
}
