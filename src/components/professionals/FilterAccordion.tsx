// components/professionals/FilterAccordion.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { MapPin } from "lucide-react";
import { Filters } from "@/hooks/professionals/useFilters";

interface Props {
  filters: Filters;
  locations: string[];
  onFilterChange: (key: string, value: any) => void;
  onCustomLocation: () => void;
}

const ageRanges = ["18-25", "26-35", "36-45", "46-55", "56+"];
const genders = ["male", "female"];
const onlineStatuses = ["24hrs", "1day", "1week", "1month", "1year"];
const venues = ["host", "visit", "both"];
const types = ["user", "professional"];
const races = ["Asian", "Black", "White", "Hispanic", "Other"];
const ethnicities = ["Hispanic", "Non-Hispanic", "Other"];
const bodyTypes = ["Slim", "Athletic", "Average", "Curvy", "Other"];
const personalityTypes = ["Introvert", "Extrovert", "Ambivert", "Other"];

export function FilterAccordion({
  filters,
  locations,
  onFilterChange,
  onCustomLocation,
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
                {/* Min Age */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="min-age-filter">Min Age</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="min-age-filter"
                        variant="outline"
                        className="w-full border-[#F3CFC6]"
                        aria-label="Select minimum age"
                      >
                        {filters.minAge || "All"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => onFilterChange("minAge", undefined)}
                      >
                        All
                      </DropdownMenuItem>
                      {ageRanges.map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onClick={() =>
                            onFilterChange("minAge", parseInt(r.split("-")[0]))
                          }
                        >
                          {r}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Max Age */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="max-age-filter">Max Age</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id="max-age-filter"
                        variant="outline"
                        className="w-full border-[#F3CFC6]"
                        aria-label="Select maximum age"
                      >
                        {filters.maxAge || "All"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => onFilterChange("maxAge", undefined)}
                      >
                        All
                      </DropdownMenuItem>
                      {ageRanges.map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onClick={() =>
                            onFilterChange(
                              "maxAge",
                              parseInt(r.split("-")[1]) || 100
                            )
                          }
                        >
                          {r}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                        onClick={() => onFilterChange("gender", "")}
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
                        onClick={() => onFilterChange("location", "")}
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
                        onClick={() => onFilterChange("hasProfilePic", "")}
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
                        onClick={() => onFilterChange("onlineStatus", "")}
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
                      onFilterChange("venue", v === "all" ? "" : v)
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

      {/* Advanced Filters - Coming Soon */}
      <AccordionItem
        value="advanced"
        className="bg-white/50 dark:bg-white/5 rounded-xl shadow-sm border relative overflow-hidden"
      >
        <AccordionTrigger className="px-6 text-lg font-semibold">
          Advanced Filters
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 relative">
          {/* Dimmed Filter Content */}
          <div className="opacity-30 pointer-events-none" aria-hidden="true">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["race", "ethnicity", "bodyType", "personalityType"].map(
                (key) => {
                  const options =
                    key === "race"
                      ? races
                      : key === "ethnicity"
                        ? ethnicities
                        : key === "bodyType"
                          ? bodyTypes
                          : personalityTypes;

                  const label =
                    key === "bodyType"
                      ? "Body Type"
                      : key === "personalityType"
                        ? "Personality"
                        : key.charAt(0).toUpperCase() + key.slice(1);

                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label>{label}</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full border-[#F3CFC6]"
                            disabled
                          >
                            {(filters as any)[key] || "All"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => onFilterChange(key, "")}
                          >
                            All
                          </DropdownMenuItem>
                          {options.map((o) => (
                            <DropdownMenuItem
                              key={o}
                              onClick={() => onFilterChange(key, o)}
                            >
                              {o}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Coming Soon Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-white/10 dark:bg-black/80 z-10">
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
