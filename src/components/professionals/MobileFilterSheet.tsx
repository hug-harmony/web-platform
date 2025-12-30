// components/professionals/MobileFilterSheet.tsx
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";
import { FilterAccordion } from "./FilterAccordion";
import { Filters } from "@/hooks/professionals/useFilters";
import { useState } from "react";

interface MobileFilterSheetProps {
  filters: Filters;
  locations: string[];
  activeFilterCount: number;
  onFilterChange: (key: string, value: unknown) => void;
  onCustomLocation: () => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  // New props for date/time filter
  onDateTimeClick: () => void;
  hasDatePendingChanges?: boolean;
}

export function MobileFilterSheet({
  filters,
  locations,
  activeFilterCount,
  onFilterChange,
  onCustomLocation,
  onApplyFilters,
  onClearFilters,
  onDateTimeClick,
  hasDatePendingChanges,
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);

  const handleApply = () => {
    onApplyFilters();
    setOpen(false);
  };

  const handleClear = () => {
    onClearFilters();
    setOpen(false);
  };

  const handleDateTimeClick = () => {
    // Close sheet first, then open date dialog
    setOpen(false);
    onDateTimeClick();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full border-[#F3CFC6]">
          <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 bg-[#F3CFC6] text-black">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Professionals</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <FilterAccordion
            filters={filters}
            locations={locations}
            onFilterChange={onFilterChange}
            onCustomLocation={onCustomLocation}
            onDateTimeClick={handleDateTimeClick}
            selectedDate={filters.selectedDate}
            timeRange={filters.timeRange}
            hasDatePendingChanges={hasDatePendingChanges}
          />
        </div>
        <SheetFooter className="flex-row gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear All
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1 bg-[#F3CFC6] text-black hover:bg-[#fff]/80"
          >
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
