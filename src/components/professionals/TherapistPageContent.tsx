// components/TherapistsPageContent.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { useProfessionals } from "@/hooks/professionals/useProfessionals";
import { useFilters } from "@/hooks/professionals/useFilters";
import { useAvailabilities } from "@/hooks/professionals/useAvailabilities";
import { SearchBar } from "@/components/professionals/SearchBar";
import { FilterAccordion } from "@/components/professionals/FilterAccordion";
import { ProfessionalsGrid } from "@/components/professionals/ProfessionalsGrid";
import { RadiusDialog } from "@/components/professionals/RadiusDialog";
import { DateTimeDialog } from "@/components/professionals/DateTimeDialog";
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
  const [tempUnit, setTempUnit] = useState<"km" | "miles">("miles");
  const [tempLat, setTempLat] = useState<number | undefined>();
  const [tempLng, setTempLng] = useState<number | undefined>();
  const [tempLocation, setTempLocation] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timeRange, setTimeRange] = useState<[number, number]>([540, 1020]); // 9AM–5PM

  const { professionals, loading } = useProfessionals(
    searchQuery,
    appliedFilters
  );
  const availabilities = useAvailabilities(selectedDate);
  const locations = Array.from(
    new Set(professionals.map((t) => t.location).filter(Boolean))
  ) as string[];

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
    setAppliedFilters((prev) => ({
      ...prev,
      selectedDate,
      timeRange,
    }));
    setIsDateTimeDialogOpen(false);
  };

  const filtered = filterAndSort(
    professionals,
    { ...appliedFilters, selectedDate, timeRange }, // ← Fixed: timeRange
    searchQuery
  );

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
            onCustomLocation={handleCustomLocation}
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

      <ProfessionalsGrid loading={loading} professionals={filtered} />

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
        availabilities={availabilities}
        onDateSelect={setSelectedDate}
        onApply={applyDateTime}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
      />
    </motion.div>
  );
}
