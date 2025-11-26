// components/TherapistsPageContent.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { useProfessionals } from "@/hooks/professionals/useProfessionals";
import { useFilters } from "@/hooks/professionals/useFilters";
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

const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
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

  const { professionals, loading } = useProfessionals(
    searchQuery,
    appliedFilters
  );

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

  // Just close the dialog - date/time is already stored in filters
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

  // Filter using appliedFilters
  const filtered = filterAndSort(professionals, appliedFilters, searchQuery);

  // Get pending date/time for button display
  const { selectedDate, timeRange } = filters;

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
            onApply={handleSearch}
            onClear={handleClear}
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
            {selectedDate
              ? `${selectedDate.toLocaleDateString()} • ${minutesToTime(timeRange[0])} - ${minutesToTime(timeRange[1])}`
              : "Filter by Availability"}
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
