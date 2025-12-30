// components/professionals/ProfessionalPageContent.tsx

"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useProfessionals } from "@/hooks/professionals/useProfessionals";
import { useFilters } from "@/hooks/professionals/useFilters";
import { useMediaQuery } from "@/hooks/professionals/useMediaQuery";
import { useKeyboardShortcut } from "@/hooks/professionals/useKeyboardShortcut";
import { FilterAccordion } from "@/components/professionals/FilterAccordion";
import { ProfessionalsGrid } from "@/components/professionals/ProfessionalsGrid";
import { RadiusDialog } from "@/components/professionals/RadiusDialog";
import { DateTimeDialog } from "@/components/professionals/DateTimeDialog";
import { ActiveFilters } from "@/components/professionals/ActiveFilters";
import { MobileFilterSheet } from "@/components/professionals/MobileFilterSheet";
import { SearchInput } from "./SearchInput";
import { FilterActions } from "./FilterActions";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.2 } },
};

export default function ProfessionalPageContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const {
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

  // Combine search query with API filters
  const combinedFilters = useMemo(
    () => ({
      ...apiFilters,
      search: searchQuery || undefined,
    }),
    [apiFilters, searchQuery]
  );

  // Fetch professionals - include locations only on initial load
  const { professionals, locations, loading, total } = useProfessionals(
    combinedFilters,
    { includeLocations: isInitialLoad }
  );

  // Mark initial load as complete after first successful fetch
  useEffect(() => {
    if (!loading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading, isInitialLoad]);

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
            {total > 0 && !loading && (
              <span className="ml-2">• {total} available</span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Input Only (no buttons) */}
          <SearchInput
            ref={searchInputRef}
            searchQuery={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
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
              onDateTimeClick={() => setIsDateTimeDialogOpen(true)}
              hasDatePendingChanges={hasDatePendingChanges}
            />
          ) : (
            <FilterAccordion
              filters={filters}
              locations={locations}
              onFilterChange={(k, v) =>
                setFilters((prev) => ({ ...prev, [k]: v }))
              }
              onCustomLocation={handleCustomLocation}
              onDateTimeClick={() => setIsDateTimeDialogOpen(true)}
              selectedDate={filters.selectedDate}
              timeRange={filters.timeRange}
              hasDatePendingChanges={hasDatePendingChanges}
            />
          )}

          {/* Action Buttons - NOW BELOW FILTERS */}
          <FilterActions
            onApply={handleSearch}
            onClear={handleClear}
            onClearSearch={handleClearSearch}
            searchQuery={searchQuery}
            hasPendingChanges={hasPendingChanges}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Active Filters Summary */}
          <ActiveFilters filters={appliedFilters} onRemove={removeFilter} />
        </CardContent>
      </Card>

      <ProfessionalsGrid
        loading={loading}
        professionals={professionals}
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
