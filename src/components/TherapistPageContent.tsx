/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, MapPin, Globe, CalendarIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import SpecialistCard from "@/components/SpecialistCard";

interface Therapist {
  _id: string;
  name: string;
  image?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  rate?: number;
  role?: string;
  tags?: string;
  biography?: string;
  education?: string;
  license?: string;
  createdAt?: string;
  lat?: number;
  lng?: number;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

async function geocode(
  location: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {
    console.error("Geocoding error:", e);
    return null;
  }
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

const DynamicMap = dynamic(
  () =>
    Promise.resolve(
      ({
        lat,
        lng,
        radiusMeters,
      }: {
        lat: number;
        lng: number;
        radiusMeters: number;
      }) => {
        const center: LatLngExpression = [lat, lng];
        return (
          <MapContainer
            center={center}
            zoom={10}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Circle center={center} radius={radiusMeters} />
          </MapContainer>
        );
      }
    ),
  { ssr: false }
);

// Generate all 30-minute time slots in AM/PM format
const allTimeSlots = [
  "12:00 AM",
  "12:30 AM",
  "1:00 AM",
  "1:30 AM",
  "2:00 AM",
  "2:30 AM",
  "3:00 AM",
  "3:30 AM",
  "4:00 AM",
  "4:30 AM",
  "5:00 AM",
  "5:30 AM",
  "6:00 AM",
  "6:30 AM",
  "7:00 AM",
  "7:30 AM",
  "8:00 AM",
  "8:30 AM",
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
  "9:30 PM",
  "10:00 PM",
  "10:30 PM",
  "11:00 PM",
  "11:30 PM",
];

export default function TherapistsPageContent() {
  const [specialists, setSpecialists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    minRating: 0,
    sortBy: "",
    currentLat: undefined as number | undefined,
    currentLng: undefined as number | undefined,
    radius: undefined as number | undefined,
    unit: "miles" as "km" | "miles",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempRadius, setTempRadius] = useState(10);
  const [tempUnit, setTempUnit] = useState<"km" | "miles">("miles");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availabilities, setAvailabilities] = useState<
    Record<string, string[]>
  >({});
  const [isDateTimeDialogOpen, setIsDateTimeDialogOpen] = useState(false);

  useEffect(() => {
    const fetchSpecialists = async () => {
      try {
        const therapistsRes = await fetch("/api/specialists", {
          cache: "no-store",
          credentials: "include",
        });
        if (!therapistsRes.ok) {
          console.error(
            "Specialists API error:",
            therapistsRes.status,
            await therapistsRes.text()
          );
          if (therapistsRes.status === 401) redirect("/login");
          throw new Error(
            `Failed to fetch specialists: ${therapistsRes.status}`
          );
        }
        let { specialists } = await therapistsRes.json();
        specialists = Array.isArray(specialists)
          ? specialists
              .filter((s: any) => s.id)
              .map((s: any) => ({
                _id: s.id,
                name: s.name,
                image: s.image || "",
                location: s.location || "",
                rating: s.rating || 0,
                reviewCount: s.reviewCount || 0,
                rate: s.rate || 0,
                role: s.role || "",
                tags: s.tags || "",
                biography: s.biography || "",
                education: s.education || "",
                license: s.license || "",
                createdAt: s.createdAt,
              }))
          : [];

        // Geocode locations
        const geocoded = await Promise.all(
          specialists.map(async (s: Therapist) => {
            if (s.location) {
              const coord = await geocode(s.location);
              if (coord) {
                return { ...s, lat: coord.lat, lng: coord.lng };
              }
            }
            return s;
          })
        );
        setSpecialists(geocoded);
      } catch (error) {
        console.error("Error fetching specialists:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpecialists();
  }, []);

  useEffect(() => {
    const fetchAvailabilities = async () => {
      if (!selectedDate) {
        setAvailabilities({});
        return;
      }
      try {
        const dateStr = selectedDate.toISOString().split("T")[0];
        const res = await fetch(
          `/api/specialists/availability?date=${dateStr}`,
          {
            credentials: "include",
          }
        );
        if (res.ok) {
          const { availabilities } = await res.json();
          const availabilityMap = availabilities.reduce(
            (
              acc: Record<string, string[]>,
              { specialistId, slots }: { specialistId: string; slots: string[] }
            ) => ({
              ...acc,
              [specialistId]: slots,
            }),
            {}
          );
          setAvailabilities(availabilityMap);
        }
      } catch (e) {
        console.error("Error fetching availabilities:", e);
      }
    };
    fetchAvailabilities();
  }, [selectedDate]);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "location"
        ? { radius: undefined, currentLat: undefined, currentLng: undefined }
        : {}),
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCurrentLocation = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFilters((prev) => ({
            ...prev,
            currentLat: position.coords.latitude,
            currentLng: position.coords.longitude,
            location: "Current Location",
          }));
          setIsDialogOpen(true);
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to retrieve your location. Please check permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const applyRadiusFilter = () => {
    setFilters((prev) => ({ ...prev, radius: tempRadius, unit: tempUnit }));
    setIsDialogOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(""); // Reset time when date changes
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const applyDateTimeFilter = () => {
    setIsDateTimeDialogOpen(false);
  };

  const isTimeAvailable = (time: string) => {
    return Object.values(availabilities).some((slots) => slots.includes(time));
  };

  const locations = Array.from(
    new Set(specialists.map((t) => t.location).filter(Boolean))
  ) as string[];

  const filterAndSort = (data: Therapist[]) =>
    data
      .filter((item) => item._id)
      .filter((item) =>
        searchQuery
          ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
      .filter((item) => {
        if (
          filters.location === "Current Location" &&
          filters.currentLat &&
          filters.currentLng &&
          filters.radius !== undefined
        ) {
          if (!item.lat || !item.lng) return false;
          let dist = calculateDistance(
            filters.currentLat,
            filters.currentLng,
            item.lat,
            item.lng
          );
          if (filters.unit === "miles") {
            dist /= 1.60934; // Convert km to miles
          }
          return dist <= filters.radius;
        } else if (
          filters.location &&
          filters.location !== "Current Location"
        ) {
          return item.location === filters.location;
        }
        return true;
      })
      .filter((item) =>
        filters.minRating ? (item.rating || 0) >= filters.minRating : true
      )
      .filter((item) => {
        if (selectedDate && selectedTime) {
          return (availabilities[item._id] || []).includes(selectedTime);
        }
        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === "rating") {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (filters.sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });

  const filteredSpecialists = filterAndSort(specialists);

  const ratings = [4.5, 4.0, 3.5, 3.0];
  const sortOptions = ["rating", "name"];
  const radiusOptions = [1, 5, 10, 25, 50, 100];

  return (
    <motion.div
      className="space-y-6 w-full max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl font-bold">
              Professional Directory
            </CardTitle>
            <p className="text-sm opacity-80">
              Find and connect with certified professionals
            </p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center mb-6 w-full space-y-2 md:space-y-0 md:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#fff]" />
              <Input
                type="text"
                placeholder="Search Professionals..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full md:w-auto"
                >
                  <MapPin className="h-6 w-6 text-[#F3CFC6]" />
                  <span>Location</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                <DropdownMenuLabel className="text-black dark:text-white">
                  Location
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleFilterChange("location", "")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  All
                </DropdownMenuItem>
                {locations.map((location) => (
                  <DropdownMenuItem
                    key={location}
                    onClick={() => handleFilterChange("location", location)}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    {location}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full md:w-auto"
              onClick={handleCurrentLocation}
            >
              <Globe className="h-6 w-6 text-[#F3CFC6]" />
              <span>Current Location</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full md:w-auto"
              onClick={() => setIsDateTimeDialogOpen(true)}
            >
              <CalendarIcon className="h-6 w-6 text-[#F3CFC6]" />
              <span>Choose Date & Time</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full md:w-auto"
                >
                  <Star className="h-6 w-6 text-[#F3CFC6]" />
                  <span>Rating</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                <DropdownMenuLabel className="text-black dark:text-white">
                  Minimum Rating
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleFilterChange("minRating", 0)}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  All
                </DropdownMenuItem>
                {ratings.map((rating) => (
                  <DropdownMenuItem
                    key={rating}
                    onClick={() => handleFilterChange("minRating", rating)}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    {rating}+
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full md:w-auto"
                >
                  <span>Sort By</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                <DropdownMenuLabel className="text-black dark:text-white">
                  Sort By
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleFilterChange("sortBy", "")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  None
                </DropdownMenuItem>
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => handleFilterChange("sortBy", option)}
                    className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-black dark:text-white">
            Available Professionals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(4)].map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-64 w-full rounded-lg bg-[#C4C4C4]/50"
                />
              ))}
            </div>
          ) : filteredSpecialists.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
            >
              <AnimatePresence>
                {filteredSpecialists.map((therapist) => (
                  <motion.div
                    key={therapist._id}
                    variants={cardVariants}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link href={`/dashboard/specialists/${therapist._id}`}>
                      <SpecialistCard
                        name={therapist.name}
                        imageSrc={therapist.image || ""}
                        location={therapist.location || ""}
                        rating={therapist.rating || 0}
                        reviewCount={therapist.reviewCount || 0}
                        rate={therapist.rate || 0}
                        className="hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 transition-colors"
                      />
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <p className="text-center text-[#C4C4C4]">No specialists found.</p>
          )}
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Search Radius</DialogTitle>
            <DialogDescription>
              Choose a radius to filter professionals near your location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="h-64 rounded-lg overflow-hidden">
              {filters.currentLat && filters.currentLng ? (
                <DynamicMap
                  lat={filters.currentLat}
                  lng={filters.currentLng}
                  radiusMeters={
                    tempUnit === "km" ? tempRadius * 1000 : tempRadius * 1609.34
                  }
                />
              ) : (
                <p className="text-center text-gray-500">
                  Location not available
                </p>
              )}
            </div>
            <Select
              onValueChange={(value) => setTempRadius(parseInt(value))}
              defaultValue="10"
            >
              <SelectTrigger className="border-[#F3CFC6] text-black dark:text-white">
                <SelectValue placeholder="Select Radius" />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((opt) => (
                  <SelectItem key={opt} value={opt.toString()}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value: string) =>
                setTempUnit(value as "km" | "miles")
              }
              defaultValue={tempUnit}
            >
              <SelectTrigger className="border-[#F3CFC6] text-black dark:text-white">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="miles">Miles</SelectItem>
                <SelectItem value="km">Kilometers (km)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={applyRadiusFilter}
              className="bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80 dark:bg-[#C4C4C4] dark:text-white dark:hover:bg-[#C4C4C4]/80"
            >
              Apply Filter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDateTimeDialogOpen}
        onOpenChange={setIsDateTimeDialogOpen}
      >
        <DialogContent className="max-w-lg bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-black dark:text-white">
              Select Date & Time
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Choose a date and time to filter professionals by their
              availability.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
              <h4 className="text-sm font-semibold text-black dark:text-white mb-2">
                Select a Date
              </h4>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="w-full"
                classNames={{
                  day_selected: "bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80",
                  day_today: "border border-[#F3CFC6]",
                  day: "text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20",
                }}
              />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-black dark:text-white">
                Select a Time
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg bg-gray-50 dark:bg-gray-900">
                {allTimeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    className={cn(
                      selectedTime === time
                        ? "bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80 dark:bg-[#C4C4C4] dark:text-white dark:hover:bg-[#C4C4C4]/80"
                        : "text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20",
                      !isTimeAvailable(time) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => handleTimeSelect(time)}
                    disabled={!isTimeAvailable(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
              {!selectedDate && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Please select a date to view available times.
                </p>
              )}
              {selectedDate && Object.keys(availabilities).length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No professionals are available on this date.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDateTimeDialogOpen(false)}
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={applyDateTimeFilter}
              className="bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80 dark:bg-[#C4C4C4] dark:text-white dark:hover:bg-[#C4C4C4]/80"
              disabled={!selectedDate || !selectedTime}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
