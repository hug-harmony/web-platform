/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, MapPin } from "lucide-react";
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
import SpecialistCard from "@/components/SpecialistCard";
import AddSpecialist from "@/components/AddSpecialist";

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
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function TherapistsPage() {
  const [users, setUsers] = useState<Therapist[]>([]);
  const [specialists, setSpecialists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    minRating: 0,
    sortBy: "",
  });

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
        throw new Error(`Failed to fetch specialists: ${therapistsRes.status}`);
      }
      const { specialists } = await therapistsRes.json();
      setSpecialists(
        specialists
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
      );
    } catch (error) {
      console.error("Error fetching specialists:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersRes = await fetch("/api/users", {
          cache: "no-store",
          credentials: "include",
        });
        if (!usersRes.ok) {
          console.error(
            "Users API error:",
            usersRes.status,
            await usersRes.text()
          );
          if (usersRes.status === 401) redirect("/login");
          throw new Error(`Failed to fetch users: ${usersRes.status}`);
        }
        const usersData = await usersRes.json();
        setUsers(
          Array.isArray(usersData)
            ? usersData
                .filter((user) => user._id)
                .map((user) => ({
                  _id: user._id,
                  name:
                    user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.name || "Unknown User",
                  image: user.image || "",
                  location: user.location || "",
                  rating: user.rating || 0,
                  reviewCount: user.reviewCount || 0,
                  rate: user.rate || 0,
                  createdAt: user.createdAt,
                }))
            : usersData._id
              ? [
                  {
                    _id: usersData._id,
                    name:
                      usersData.firstName && usersData.lastName
                        ? `${usersData.firstName} ${usersData.lastName}`
                        : usersData.name || "Unknown User",
                    image: usersData.image || "",
                    location: usersData.location || "",
                    rating: usersData.rating || 0,
                    reviewCount: usersData.reviewCount || 0,
                    rate: usersData.rate || 0,
                    createdAt: usersData.createdAt,
                  },
                ]
              : []
        );

        await fetchSpecialists();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
      .filter((item) =>
        filters.location ? item.location === filters.location : true
      )
      .filter((item) =>
        filters.minRating ? (item.rating || 0) >= filters.minRating : true
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

  const filteredSpecialists = filterAndSort(specialists);

  const ratings = [4.5, 4.0, 3.5, 3.0];
  const sortOptions = ["rating", "name"];

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
        <CardContent>
          <div className="flex items-center mb-6 w-full space-x-2">
            <div className="relative flex-grow">
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
                  className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
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
                  className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-64 w-full rounded-lg bg-[#C4C4C4]/50"
                />
              ))}
            </div>
          ) : filteredSpecialists.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
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
    </motion.div>
  );
}
