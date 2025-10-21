/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, CalendarIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import SpecialistCard from "@/components/SpecialistCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

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
  age?: number;
  gender?: "male" | "female" | "other";
  race?: string;
  ethnicity?: string;
  bodyType?: string;
  personalityType?: string;
  lastOnline?: string;
  venue?: string; // Changed to single string
  type?: "user" | "professional";
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
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,
      {
        headers: { "User-Agent": "YourAppName/1.0 (your.email@example.com)" },
      }
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
  const initialFilters = {
    location: "",
    minRating: 0,
    sortBy: "",
    currentLat: undefined as number | undefined,
    currentLng: undefined as number | undefined,
    radius: undefined as number | undefined,
    unit: "miles" as "km" | "miles",
    minAge: undefined as number | undefined,
    maxAge: undefined as number | undefined,
    gender: "" as "" | "male" | "female",
    hasProfilePic: "" as "" | "yes" | "no",
    onlineStatus: "" as "" | "24hrs" | "1day" | "1week" | "1month" | "1year",
    venue: "", // Changed to single string
    type: "" as "" | "user" | "professional",
    race: "",
    ethnicity: "",
    bodyType: "",
    personalityType: "",
  };

  const [specialists, setSpecialists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [isRadiusDialogOpen, setIsRadiusDialogOpen] = useState(false);
  const [isDateTimeDialogOpen, setIsDateTimeDialogOpen] = useState(false);
  const [tempRadius, setTempRadius] = useState(10);
  const [tempUnit, setTempUnit] = useState<"km" | "miles">("miles");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availabilities, setAvailabilities] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    const fetchSpecialists = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.append("search", searchQuery);
        if (
          appliedFilters.location &&
          appliedFilters.location !== "Current Location"
        )
          queryParams.append("location", appliedFilters.location);
        if (appliedFilters.minRating)
          queryParams.append("minRating", appliedFilters.minRating.toString());
        if (appliedFilters.sortBy)
          queryParams.append("sortBy", appliedFilters.sortBy);
        if (
          appliedFilters.currentLat &&
          appliedFilters.currentLng &&
          appliedFilters.radius
        ) {
          queryParams.append("lat", appliedFilters.currentLat.toString());
          queryParams.append("lng", appliedFilters.currentLng.toString());
          queryParams.append("radius", appliedFilters.radius.toString());
          queryParams.append("unit", appliedFilters.unit);
        }
        if (appliedFilters.minAge)
          queryParams.append("minAge", appliedFilters.minAge.toString());
        if (appliedFilters.maxAge)
          queryParams.append("maxAge", appliedFilters.maxAge.toString());
        if (appliedFilters.gender)
          queryParams.append("gender", appliedFilters.gender);
        if (appliedFilters.hasProfilePic)
          queryParams.append("hasProfilePic", appliedFilters.hasProfilePic);
        if (appliedFilters.onlineStatus)
          queryParams.append("onlineStatus", appliedFilters.onlineStatus);
        if (appliedFilters.venue)
          queryParams.append("venue", appliedFilters.venue); // Changed to venue
        if (appliedFilters.type)
          queryParams.append("type", appliedFilters.type);
        if (appliedFilters.race)
          queryParams.append("race", appliedFilters.race);
        if (appliedFilters.ethnicity)
          queryParams.append("ethnicity", appliedFilters.ethnicity);
        if (appliedFilters.bodyType)
          queryParams.append("bodyType", appliedFilters.bodyType);
        if (appliedFilters.personalityType)
          queryParams.append("personalityType", appliedFilters.personalityType);

        const therapistsRes = await fetch(
          `/api/specialists?${queryParams.toString()}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );
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
                lat: s.lat || undefined,
                lng: s.lng || undefined,
                age: s.age || undefined,
                gender: s.gender || undefined,
                race: s.race || "",
                ethnicity: s.ethnicity || "",
                bodyType: s.bodyType || "",
                personalityType: s.personalityType || "",
                lastOnline: s.lastOnline || undefined,
                venue: s.venue || "", // Changed to venue
                type: s.type || "professional",
              }))
          : [];

        setSpecialists(specialists);
      } catch (error) {
        console.error("Error fetching specialists:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpecialists();
  }, [searchQuery, appliedFilters]);

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

  const handleFilterChange = (key: string, value: any) => {
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
          setIsRadiusDialogOpen(true); // Open radius dialog
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
    setIsRadiusDialogOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime("");
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

  const radiusOptions = [1, 5, 10, 25, 50, 100];
  const genders = ["male", "female"];
  const onlineStatuses = ["24hrs", "1day", "1week", "1month", "1year"];
  const venues = ["host", "visit", "both"];
  const types = ["user", "professional"];
  const races = ["Asian", "Black", "White", "Hispanic", "Other"];
  const ethnicities = ["Hispanic", "Non-Hispanic", "Other"];
  const bodyTypes = ["Slim", "Athletic", "Average", "Curvy", "Other"];
  const personalityTypes = ["Introvert", "Extrovert", "Ambivert", "Other"];
  const ageRanges = ["18-25", "26-35", "36-45", "46-55", "56+"];

  const filterAndSort = (data: Therapist[], filters: typeof initialFilters) =>
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
            dist /= 1.60934;
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
      .filter((item) => {
        if (filters.minAge !== undefined && item.age) {
          return item.age >= filters.minAge;
        }
        return true;
      })
      .filter((item) => {
        if (filters.maxAge !== undefined && item.age) {
          return item.age <= filters.maxAge;
        }
        return true;
      })
      .filter((item) =>
        filters.gender ? item.gender === filters.gender : true
      )
      .filter((item) => {
        if (filters.hasProfilePic === "yes") return !!item.image;
        if (filters.hasProfilePic === "no") return !item.image;
        return true;
      })
      .filter((item) => {
        if (filters.onlineStatus && item.lastOnline) {
          const lastOnlineDate = new Date(item.lastOnline);
          const now = new Date();
          let threshold = 0;
          switch (filters.onlineStatus) {
            case "24hrs":
              threshold = 24 * 60 * 60 * 1000;
              break;
            case "1day":
              threshold = 24 * 60 * 60 * 1000;
              break;
            case "1week":
              threshold = 7 * 24 * 60 * 60 * 1000;
              break;
            case "1month":
              threshold = 30 * 24 * 60 * 60 * 1000;
              break;
            case "1year":
              threshold = 365 * 24 * 60 * 60 * 1000;
              break;
          }
          return now.getTime() - lastOnlineDate.getTime() <= threshold;
        }
        return true;
      })
      .filter(
        (item) => (filters.venue ? item.venue === filters.venue : true) // Changed to single string comparison
      )
      .filter((item) => (filters.type ? item.type === filters.type : true))
      .filter((item) => (filters.race ? item.race === filters.race : true))
      .filter((item) =>
        filters.ethnicity ? item.ethnicity === filters.ethnicity : true
      )
      .filter((item) =>
        filters.bodyType ? item.bodyType === filters.bodyType : true
      )
      .filter((item) =>
        filters.personalityType
          ? item.personalityType === filters.personalityType
          : true
      )
      .sort((a, b) => {
        if (filters.sortBy === "rating") {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (filters.sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });

  const filteredSpecialists = filterAndSort(specialists, appliedFilters);

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
        <CardContent className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Search Professionals..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-12 pr-10 py-3 rounded-full border border-[#F3CFC6] focus:ring-2 focus:ring-[#F3CFC6]/50 text-black dark:text-white"
            />
          </div>

          <Accordion
            type="single"
            collapsible
            className="w-full bg-white/50 px-4 rounded-lg shadow-sm"
          >
            <AccordionItem value="filters">
              <AccordionTrigger className="cursor-pointer">
                Filters
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6">
                  <div className="bg-white/5 dark:bg-black/10 rounded-xl p-4 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">
                      Basic Filters
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="min-age">Min Age</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              id="min-age"
                              variant="outline"
                              className={`w-full border-[#F3CFC6] ${filters.minAge ? "bg-[#F3CFC6]/10" : ""}`}
                            >
                              {filters.minAge || "All"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() =>
                                handleFilterChange("minAge", undefined)
                              }
                            >
                              All
                            </DropdownMenuItem>
                            {ageRanges.map((range) => (
                              <DropdownMenuItem
                                key={range}
                                onClick={() =>
                                  handleFilterChange(
                                    "minAge",
                                    parseInt(range.split("-")[0])
                                  )
                                }
                              >
                                {range}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="max-age">Max Age</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              id="max-age"
                              variant="outline"
                              className={`w-full border-[#F3CFC6] ${filters.maxAge ? "bg-[#F3CFC6]/10" : ""}`}
                            >
                              {filters.maxAge || "All"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() =>
                                handleFilterChange("maxAge", undefined)
                              }
                            >
                              All
                            </DropdownMenuItem>
                            {ageRanges.map((range) => (
                              <DropdownMenuItem
                                key={range}
                                onClick={() =>
                                  handleFilterChange(
                                    "maxAge",
                                    parseInt(range.split("-")[1]) || 100
                                  )
                                }
                              >
                                {range}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="gender">Gender</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              id="gender"
                              variant="outline"
                              className={`w-full border-[#F3CFC6] ${filters.gender ? "bg-[#F3CFC6]/10" : ""}`}
                            >
                              {filters.gender || "All"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => handleFilterChange("gender", "")}
                            >
                              All
                            </DropdownMenuItem>
                            {genders.map((g) => (
                              <DropdownMenuItem
                                key={g}
                                onClick={() => handleFilterChange("gender", g)}
                              >
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="location">Location</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              id="location"
                              variant="outline"
                              className={`w-full flex items-center border-[#F3CFC6] ${filters.location ? "bg-[#F3CFC6]/10" : ""}`}
                            >
                              <MapPin className="mr-2 h-4 w-4" />
                              {filters.location || "All"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => handleFilterChange("location", "")}
                            >
                              All
                            </DropdownMenuItem>
                            {locations.map((loc) => (
                              <DropdownMenuItem
                                key={loc}
                                onClick={() =>
                                  handleFilterChange("location", loc)
                                }
                              >
                                {loc}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem onClick={handleCurrentLocation}>
                              Current Location
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 dark:bg-black/10 rounded-xl p-4 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">More Filters</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="profile-pic">Profile Picture</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              id="profile-pic"
                              variant="outline"
                              className={`w-full border-[#F3CFC6] ${filters.hasProfilePic ? "bg-[#F3CFC6]/10" : ""}`}
                            >
                              {filters.hasProfilePic || "All"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() =>
                                handleFilterChange("hasProfilePic", "")
                              }
                            >
                              All
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleFilterChange("hasProfilePic", "yes")
                              }
                            >
                              With Pic
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleFilterChange("hasProfilePic", "no")
                              }
                            >
                              Without Pic
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="online-status">Online Status</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              id="online-status"
                              variant="outline"
                              className={`w-full border-[#F3CFC6] ${filters.onlineStatus ? "bg-[#F3CFC6]/10" : ""}`}
                            >
                              {filters.onlineStatus || "All"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() =>
                                handleFilterChange("onlineStatus", "")
                              }
                            >
                              All
                            </DropdownMenuItem>
                            {onlineStatuses.map((status) => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() =>
                                  handleFilterChange("onlineStatus", status)
                                }
                              >
                                Last {status.replace(/(\d+)([a-z]+)/, "$1 $2")}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="venue">Venue</Label>
                        <Select
                          value={filters.venue || "all"}
                          onValueChange={(value) =>
                            handleFilterChange(
                              "venue",
                              value === "all" ? "" : value
                            )
                          }
                        >
                          <SelectTrigger
                            id="venue"
                            className={`w-full border-[#F3CFC6] ${filters.venue ? "bg-[#F3CFC6]/10" : ""}`}
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

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="type">Type</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              id="type"
                              variant="outline"
                              className={`w-full border-[#F3CFC6] ${filters.type ? "bg-[#F3CFC6]/10" : ""}`}
                            >
                              {filters.type || "All"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => handleFilterChange("type", "")}
                            >
                              All
                            </DropdownMenuItem>
                            {types.map((t) => (
                              <DropdownMenuItem
                                key={t}
                                onClick={() => handleFilterChange("type", t)}
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

            <AccordionItem value="advanced-filters">
              <AccordionTrigger className="cursor-pointer">
                Advanced Filters
              </AccordionTrigger>
              <AccordionContent>
                <div className="bg-white/5 dark:bg-black/10 rounded-xl p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">
                    Advanced Filters
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="race">Race</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            id="race"
                            variant="outline"
                            className={`w-full border-[#F3CFC6] ${filters.race ? "bg-[#F3CFC6]/10" : ""}`}
                          >
                            {filters.race || "All"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleFilterChange("race", "")}
                          >
                            All
                          </DropdownMenuItem>
                          {races.map((r) => (
                            <DropdownMenuItem
                              key={r}
                              onClick={() => handleFilterChange("race", r)}
                            >
                              {r}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="ethnicity">Ethnicity</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            id="ethnicity"
                            variant="outline"
                            className={`w-full border-[#F3CFC6] ${filters.ethnicity ? "bg-[#F3CFC6]/10" : ""}`}
                          >
                            {filters.ethnicity || "All"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleFilterChange("ethnicity", "")}
                          >
                            All
                          </DropdownMenuItem>
                          {ethnicities.map((e) => (
                            <DropdownMenuItem
                              key={e}
                              onClick={() => handleFilterChange("ethnicity", e)}
                            >
                              {e}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="body-type">Body Type</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            id="body-type"
                            variant="outline"
                            className={`w-full border-[#F3CFC6] ${filters.bodyType ? "bg-[#F3CFC6]/10" : ""}`}
                          >
                            {filters.bodyType || "All"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleFilterChange("bodyType", "")}
                          >
                            All
                          </DropdownMenuItem>
                          {bodyTypes.map((b) => (
                            <DropdownMenuItem
                              key={b}
                              onClick={() => handleFilterChange("bodyType", b)}
                            >
                              {b}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="personality-type">Personality Type</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            id="personality-type"
                            variant="outline"
                            className={`w-full border-[#F3CFC6] ${filters.personalityType ? "bg-[#F3CFC6]/10" : ""}`}
                          >
                            {filters.personalityType || "All"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() =>
                              handleFilterChange("personalityType", "")
                            }
                          >
                            All
                          </DropdownMenuItem>
                          {personalityTypes.map((p) => (
                            <DropdownMenuItem
                              key={p}
                              onClick={() =>
                                handleFilterChange("personalityType", p)
                              }
                            >
                              {p}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex gap-4 mt-4">
            <Button
              onClick={() => setAppliedFilters(filters)}
              className="bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80"
            >
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters(initialFilters);
                setAppliedFilters(initialFilters);
                setSearchQuery("");
                setSelectedDate(undefined);
                setSelectedTime("");
              }}
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
            >
              Clear
            </Button>
            {/* <Button
              variant="outline"
              onClick={() => setIsDateTimeDialogOpen(true)}
              className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Select Date & Time
            </Button> */}
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

      <Dialog open={isRadiusDialogOpen} onOpenChange={setIsRadiusDialogOpen}>
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="radius">Radius</Label>
              <Select
                onValueChange={(value) => setTempRadius(parseInt(value))}
                defaultValue="10"
              >
                <SelectTrigger
                  id="radius"
                  className="border-[#F3CFC6] text-black dark:text-white"
                >
                  <SelectValue placeholder="Select Radius" />
                </SelectTrigger>
                <SelectContent>
                  {radiusOptions.map((opt) => (
                    <SelectItem key={opt} value={opt.toString()}>
                      {opt} miles
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
