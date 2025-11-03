// components/TherapistsPageContent.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { useSpecialists } from "@/hooks/specialists/useSpecialists";
import { useFilters } from "@/hooks/specialists/useFilters"; // Removed unused 'Filters'
import { useAvailabilities } from "@/hooks/specialists/useAvailabilities";
import { SearchBar } from "@/components/specialists/SearchBar";
import { FilterAccordion } from "@/components/specialists/FilterAccordion";
import { SpecialistsGrid } from "@/components/specialists/SpecialistsGrid";
import { RadiusDialog } from "@/components/specialists/RadiusDialog";
import { DateTimeDialog } from "@/components/specialists/DateTimeDialog";
import { filterAndSort } from "@/lib/utils";
import { Button } from "../ui/button";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.2 } },
};

export default function TherapistsPageContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const { filters, setFilters, appliedFilters, setAppliedFilters, reset } =
    useFilters();
  const [isRadiusDialogOpen, setIsRadiusDialogOpen] = useState(false);
  const [isDateTimeDialogOpen, setIsDateTimeDialogOpen] = useState(false);
  const [tempRadius, setTempRadius] = useState(10);
  const [tempUnit] = useState<"km" | "miles">("miles");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timeRange, setTimeRange] = useState<[number, number]>([540, 1020]); // 9AM–5PM

  const { specialists, loading } = useSpecialists(searchQuery, appliedFilters);
  const availabilities = useAvailabilities(selectedDate);
  const locations = Array.from(
    new Set(specialists.map((t) => t.location).filter(Boolean))
  ) as string[];

  const handleCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFilters((prev) => ({
          ...prev,
          currentLat: pos.coords.latitude,
          currentLng: pos.coords.longitude,
          location: "Current Location",
        }));
        setIsRadiusDialogOpen(true);
      },
      () => alert("Location denied")
    );
  };

  const applyRadius = () => {
    setFilters((prev) => ({ ...prev, radius: tempRadius, unit: tempUnit }));
    setIsRadiusDialogOpen(false);
  };

  const applyDateTime = () => {
    setAppliedFilters((prev) => ({
      ...prev,
      selectedDate,
      timeRange,
    }));
    setIsDateTimeDialogOpen(false);
  };

  const filtered = filterAndSort(
    specialists,
    { ...appliedFilters, selectedDate, timeRange }, // ← Fixed: timeRange
    searchQuery
  );

  return (
    <motion.div
      className="space-y-6 w-full max-w-7xl mx-auto"
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
            searchQuery={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            onApply={() => setAppliedFilters(filters)}
            onClear={() => {
              setSearchQuery("");
              reset();
              setSelectedDate(undefined);
              setTimeRange([540, 1020]); // ← Reset range
            }}
          />
          <FilterAccordion
            filters={filters}
            locations={locations}
            onFilterChange={(k, v) =>
              setFilters((prev) => ({ ...prev, [k]: v }))
            }
            onCurrentLocation={handleCurrentLocation}
          />
          <Button
            variant="outline"
            onClick={() => setIsDateTimeDialogOpen(true)}
            className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Filter by Availability
          </Button>
        </CardContent>
      </Card>

      <SpecialistsGrid loading={loading} specialists={filtered} />

      <RadiusDialog
        open={isRadiusDialogOpen}
        onOpenChange={setIsRadiusDialogOpen}
        currentLat={filters.currentLat}
        currentLng={filters.currentLng}
        tempRadius={tempRadius}
        tempUnit={tempUnit}
        onTempRadiusChange={setTempRadius}
        onApply={applyRadius}
      />

      <DateTimeDialog
        open={isDateTimeDialogOpen}
        onOpenChange={setIsDateTimeDialogOpen}
        selectedDate={selectedDate}
        availabilities={availabilities}
        onDateSelect={setSelectedDate}
        onApply={applyDateTime}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
      />
    </motion.div>
  );
}
