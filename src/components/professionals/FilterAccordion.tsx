// components/professionals/FilterAccordion.tsx


"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MapPin, CalendarIcon } from "lucide-react";
import { Filters } from "@/hooks/professionals/useFilters";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Slider } from "../ui/slider";
import { cn } from "@/lib/utils";

interface Props {
  filters: Filters;
  locations: string[];
  onFilterChange: (key: string, value: string | number | undefined) => void;
  onCustomLocation: () => void;
  // Date/Time props
  onDateTimeClick: () => void;
  selectedDate?: Date;
  timeRange: [number, number];
  hasDatePendingChanges?: boolean;
}

const genders = ["male", "female"];
const onlineStatuses = ["24hrs", "1day", "1week", "1month", "1year"];
const venues = ["host", "visit", "both"];
const types = ["user", "professional"];
const races = ["Asian", "Black", "White", "Hispanic", "Other"];
const ethnicities = ["Hispanic", "Non-Hispanic", "Other"];
const bodyTypes = ["Slim", "Athletic", "Average", "Curvy", "Other"];
const personalityTypes = ["Introvert", "Extrovert", "Ambivert", "Other"];

// Helper to convert minutes to time string
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`;
}

export function FilterAccordion({
  filters,
  locations,
  onFilterChange,
  onCustomLocation,
  onDateTimeClick,
  selectedDate,
  timeRange,
  hasDatePendingChanges,
}: Props) {
  return (
    <Accordion type="multiple" className="w-full space-y-4">
      {/* Main Filters: Basic + More */}
      <AccordionItem
        value="filters"
        className="bg-white/50 dark:bg-white/5 rounded-xl shadow-sm border"
      >
        <AccordionTrigger className="px-6 text-lg font-semibold">
          Filters
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">
          <div className="space-y-6">
            {/* Basic Filters */}
            <div>
              <h3 className="text-base font-medium text-muted-foreground mb-3">
                Basic Filters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Age Range Slider */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="age-range-filter">Age Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="age-range-filter"
                        variant="outline"
                        className="w-full border-[#F3CFC6]"
                        aria-label="Select age range"
                      >
                        {filters.minAge && filters.maxAge
                          ? `${filters.minAge} - ${filters.maxAge}`
                          : filters.minAge
                            ? `${filters.minAge}+`
                            : filters.maxAge
                              ? `Up to ${filters.maxAge}`
                              : "All Ages"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="start">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Age Range</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs text-muted-foreground"
                            onClick={() => {
                              onFilterChange("minAge", undefined);
                              onFilterChange("maxAge", undefined);
                            }}
                          >
                            Reset
                          </Button>
                        </div>

                        <Slider
                          min={18}
                          max={80}
                          step={1}
                          value={[filters.minAge || 18, filters.maxAge || 80]}
                          onValueChange={(values) => {
                            onFilterChange(
                              "minAge",
                              values[0] === 18 ? undefined : values[0]
                            );
                            onFilterChange(
                              "maxAge",
                              values[1] === 80 ? undefined : values[1]
                            );
                          }}
                          className="w-full"
                        />

                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{filters.minAge || 18}</span>
                          <span>{filters.maxAge || 80}</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Gender */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gender-filter">Gender</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="gender-filter"
                        variant="outline"
                        className="w-full border-[#F3CFC6]"
                        aria-label="Select gender"
                      >
                        {filters.gender
                          ? filters.gender.charAt(0).toUpperCase() +
                          filters.gender.slice(1)
                          : "All"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => onFilterChange("gender", undefined)}
                      >
                        All
                      </DropdownMenuItem>
                      {genders.map((g) => (
                        <DropdownMenuItem
                          key={g}
                          onClick={() => onFilterChange("gender", g)}
                        >
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Location */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="location-filter">Location</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="location-filter"
                        variant="outline"
                        className="w-full flex items-center border-[#F3CFC6]"
                        aria-label="Select location"
                      >
                        <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
                        <span className="truncate">
                          {filters.location || "All"}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => onFilterChange("location", undefined)}
                      >
                        All
                      </DropdownMenuItem>
                      {locations.map((loc) => (
                        <DropdownMenuItem
                          key={loc}
                          onClick={() => onFilterChange("location", loc)}
                        >
                          {loc}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem onClick={onCustomLocation}>
                        Custom Location
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* More Filters */}
            <div>
              <h3 className="text-base font-medium text-muted-foreground mb-3">
                More Filters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Profile Pic */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profile-pic-filter">Profile Picture</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="profile-pic-filter"
                        variant="outline"
                        className="w-full border-[#F3CFC6]"
                        aria-label="Filter by profile picture"
                      >
                        {filters.hasProfilePic === "yes"
                          ? "With Pic"
                          : filters.hasProfilePic === "no"
                            ? "Without Pic"
                            : "All"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange("hasProfilePic", undefined)
                        }
                      >
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onFilterChange("hasProfilePic", "yes")}
                      >
                        With Pic
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onFilterChange("hasProfilePic", "no")}
                      >
                        Without Pic
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Online Status */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="online-status-filter">Online Status</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="online-status-filter"
                        variant="outline"
                        className="w-full border-[#F3CFC6]"
                        aria-label="Filter by online status"
                      >
                        {filters.onlineStatus
                          ? `Last ${filters.onlineStatus.replace(/(\d+)([a-z]+)/, "$1 $2")}`
                          : "All"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange("onlineStatus", undefined)
                        }
                      >
                        All
                      </DropdownMenuItem>
                      {onlineStatuses.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => onFilterChange("onlineStatus", s)}
                        >
                          Last {s.replace(/(\d+)([a-z]+)/, "$1 $2")}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Venue */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="venue-filter">Venue</Label>
                  <Select
                    value={filters.venue || "all"}
                    onValueChange={(v) =>
                      onFilterChange("venue", v === "all" ? undefined : v)
                    }
                  >
                    <SelectTrigger
                      id="venue-filter"
                      className="w-full border-[#F3CFC6]"
                      aria-label="Select venue preference"
                    >
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {venues.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="type-filter">Type</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="type-filter"
                        variant="outline"
                        className="w-full border-[#F3CFC6]"
                        aria-label="Filter by user type"
                      >
                        {filters.type
                          ? filters.type.charAt(0).toUpperCase() +
                          filters.type.slice(1)
                          : "All"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => onFilterChange("type", "")}
                      >
                        All
                      </DropdownMenuItem>
                      {types.map((t) => (
                        <DropdownMenuItem
                          key={t}
                          onClick={() => onFilterChange("type", t)}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Advanced Filters - Coming Soon (but fully functional underneath) */}
      <AccordionItem
        value="advanced"
        className="bg-white/50 dark:bg-white/5 rounded-xl shadow-sm border relative overflow-hidden"
      >
        <AccordionTrigger className="px-6 text-lg font-semibold">
          Advanced Filters
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 relative">
          {/* ============================================
              FULLY FUNCTIONAL CONTENT - Just visually blocked by overlay
              To enable: Delete the "Coming Soon Overlay" div below
              ============================================ */}
          <div className="space-y-6">
            {/* Date/Time Availability Filter */}
            <div>
              <h3 className="text-base font-medium text-muted-foreground mb-3">
                Availability
              </h3>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="availability-filter">Date & Time</Label>
                <Button
                  id="availability-filter"
                  variant="outline"
                  onClick={onDateTimeClick}
                  className={cn(
                    "w-full border-[#F3CFC6] justify-start",
                    hasDatePendingChanges && "ring-2 ring-amber-400"
                  )}
                  aria-label="Filter by availability"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {selectedDate ? (
                    <span className="flex items-center gap-2">
                      {selectedDate.toLocaleDateString()} •{" "}
                      {minutesToTime(timeRange[0])} -{" "}
                      {minutesToTime(timeRange[1])}
                      {hasDatePendingChanges && (
                        <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-medium">
                          pending
                        </span>
                      )}
                    </span>
                  ) : (
                    "Filter by Availability"
                  )}
                </Button>
              </div>
            </div>

            {/* Demographics Filters */}
            <div>
              <h3 className="text-base font-medium text-muted-foreground mb-3">
                Demographics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Race */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="race-filter">Race</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="race-filter"
                        variant="outline"
                        className="w-full border-[#F3CFC6]"
                        aria-label="Filter by race"
                      >
                        {filters.race || "All"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => onFilterChange("race", "")}
                      >
                        All
                      </DropdownMenuItem>
                      {races.map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onClick={() => onFilterChange("race", r)}
                        >
                          {r}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Ethnicity */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ethnicity-filter">Ethnicity</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="ethnicity-filter"
                        variant="outline"
                        className="w-full border-[#F3CFC6]"
                        aria-label="Filter by ethnicity"
                      >
                        {filters.ethnicity || "All"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => onFilterChange("ethnicity", "")}
                      >
                        All
                      </DropdownMenuItem>
                      {ethnicities.map((e) => (
                        <DropdownMenuItem
                          key={e}
                          onClick={() => onFilterChange("ethnicity", e)}
                        >
                          {e}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Body Type */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="body-type-filter">Body Type</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="body-type-filter"
                        variant="outline"
                        className="w-full border-[#F3CFC6]"
                        aria-label="Filter by body type"
                      >
                        {filters.bodyType || "All"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => onFilterChange("bodyType", "")}
                      >
                        All
                      </DropdownMenuItem>
                      {bodyTypes.map((b) => (
                        <DropdownMenuItem
                          key={b}
                          onClick={() => onFilterChange("bodyType", b)}
                        >
                          {b}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Personality Type */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="personality-filter">Personality</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="personality-filter"
                        variant="outline"
                        className="w-full border-[#F3CFC6]"
                        aria-label="Filter by personality type"
                      >
                        {filters.personalityType || "All"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => onFilterChange("personalityType", "")}
                      >
                        All
                      </DropdownMenuItem>
                      {personalityTypes.map((p) => (
                        <DropdownMenuItem
                          key={p}
                          onClick={() => onFilterChange("personalityType", p)}
                        >
                          {p}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================
              COMING SOON OVERLAY
              To enable advanced filters: DELETE THIS ENTIRE DIV
              ============================================ */}
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 z-10">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary mb-1">
                Coming Soon
              </p>
              <p className="text-sm text-muted-foreground">
                Advanced filters are in development
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
