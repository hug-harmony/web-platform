"use client";

import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Video, Users, Package, Star, MapPin } from "lucide-react";
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
import SpecialistCard from "@/components/Specialist_Cards";

interface Therapist {
  _id: string;
  userId: string;
  name: string;
  date?: string;
  time?: string;
  imageSrc?: string;
  createdAt?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  rate?: number; // Added rate field
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const ServiceButton: React.FC<{ icon: JSX.Element; label: string }> = ({
  icon,
  label,
}) => (
  <Button variant="outline" className="flex items-center space-x-2">
    {icon}
    <span>{label}</span>
  </Button>
);

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: "",
    minRating: 0,
    sortBy: "",
  });

  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        const res = await fetch("/api/therapists/list", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) {
          if (res.status === 401) {
            redirect("/login");
          }
          throw new Error(
            `Failed to fetch therapists: ${res.status} ${res.statusText}`
          );
        }
        const data = await res.json();
        setTherapists(data);
      } catch (error) {
        console.error("Error fetching therapists:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTherapists();
  }, []);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredTherapists = therapists
    .filter((therapist) =>
      filters.location ? therapist.location === filters.location : true
    )
    .filter((therapist) =>
      filters.minRating ? (therapist.rating || 0) >= filters.minRating : true
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

  const exampleTherapists: Therapist[] = [
    {
      _id: "1",
      userId: "u1",
      name: "Alex Smith",
      date: "2025-08-10",
      time: "10:00 AM",
      imageSrc: "/register.jpg",
      location: "New York, NY",
      rating: 4.8,
      reviewCount: 120,
      rate: 50,
    },
    {
      _id: "8",
      userId: "u1",
      name: "Alex Smith",
      date: "2025-08-10",
      time: "10:00 AM",
      imageSrc: "/images/alex.jpg",
      location: "New York, NY",
      rating: 4.8,
      reviewCount: 120,
      rate: 50,
    },
    {
      _id: "7",
      userId: "u1",
      name: "Alex Smith",
      date: "2025-08-10",
      time: "10:00 AM",
      imageSrc: "/images/alex.jpg",
      location: "New York, NY",
      rating: 4.8,
      reviewCount: 120,
      rate: 50,
    },
    {
      _id: "2",
      userId: "u2",
      name: "Jamie Lee",
      date: "2025-08-11",
      time: "2:00 PM",
      imageSrc: "/images/jamie.jpg",
      location: "Los Angeles, CA",
      rating: 4.9,
      reviewCount: 95,
      rate: 60,
    },
    {
      _id: "3",
      userId: "u3",
      name: "Taylor Brown",
      date: "2025-08-12",
      time: "3:00 PM",
      location: "Chicago, IL",
      rating: 4.7,
      reviewCount: 80,
      rate: 45,
    },
  ];

  const exampleSpecialists: Therapist[] = [
    {
      _id: "4",
      userId: "u4",
      name: "Sam Carter",
      imageSrc: "/images/sam.jpg",
      location: "Boston, MA",
      rating: 4.6,
      reviewCount: 110,
      rate: 55,
    },
    {
      _id: "5",
      userId: "u5",
      name: "Robin White",
      location: "Seattle, WA",
      rating: 4.8,
      reviewCount: 130,
      rate: 65,
    },
    {
      _id: "6",
      userId: "u6",
      name: "Casey Green",
      imageSrc: "/images/casey.jpg",
      location: "Austin, TX",
      rating: 4.9,
      reviewCount: 100,
      rate: 70,
    },
  ];

  const locations = [
    "New York, NY",
    "Los Angeles, CA",
    "Chicago, IL",
    "Boston, MA",
    "Seattle, WA",
    "Austin, TX",
  ];
  const ratings = [4.5, 4.0, 3.5, 3.0];
  const sortOptions = ["rating", "name"];

  return (
    <motion.div
      className="flex min-h-screen items-start p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="w-full max-w-6xl">
        <div className="flex items-center mb-6 w-full space-x-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search therapists..."
              className="p-2 pl-10 rounded border border-gray-300 w-full"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Location</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Location</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleFilterChange("location", "")}
              >
                All
              </DropdownMenuItem>
              {locations.map((location) => (
                <DropdownMenuItem
                  key={location}
                  onClick={() => handleFilterChange("location", location)}
                >
                  {location}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Star className="h-5 w-5" />
                <span>Rating</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Minimum Rating</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleFilterChange("minRating", 0)}
              >
                All
              </DropdownMenuItem>
              {ratings.map((rating) => (
                <DropdownMenuItem
                  key={rating}
                  onClick={() => handleFilterChange("minRating", rating)}
                >
                  {rating}+
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <span>Sort By</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleFilterChange("sortBy", "")}
              >
                None
              </DropdownMenuItem>
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => handleFilterChange("sortBy", option)}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <section className="mb-6">
          <div>
            <h2 className="text-lg font-semibold text-center mb-4">
              Cuddler Directory
            </h2>
            {loading ? (
              <p className="text-center">Loading...</p>
            ) : filteredTherapists.length > 0 ? (
              <motion.div
                className="flex flex-wrap gap-4"
                variants={containerVariants}
              >
                <AnimatePresence>
                  {filteredTherapists.map((therapist) => (
                    <motion.div key={therapist._id} variants={cardVariants}>
                      <Link href={`/dashboard/therapists/${therapist._id}`}>
                        <SpecialistCard
                          name={therapist.name}
                          imageSrc={therapist.imageSrc || ""}
                          location={therapist.location || ""}
                          rating={therapist.rating || 0}
                          reviewCount={therapist.reviewCount || 0}
                          rate={therapist.rate || 0}
                        />
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                className="grid grid-cols-4 gap-4"
                variants={containerVariants}
              >
                <AnimatePresence>
                  {exampleTherapists.map((therapist) => (
                    <motion.div key={therapist._id} variants={cardVariants}>
                      <Link href={`/dashboard/therapists/${therapist._id}`}>
                        <SpecialistCard
                          name={therapist.name}
                          imageSrc={therapist.imageSrc || ""}
                          location={therapist.location || ""}
                          rating={therapist.rating || 0}
                          reviewCount={therapist.reviewCount || 0}
                          rate={therapist.rate || 0}
                        />
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </section>

        <section className="mb-6">
          <div>
            <h2 className="text-lg font-semibold text-center mb-4">
              Specialists
            </h2>
            {loading ? (
              <p className="text-center">Loading...</p>
            ) : filteredTherapists.length > 0 ? (
              <motion.div
                className="flex flex-wrap justify-center gap-4"
                variants={containerVariants}
              >
                <AnimatePresence>
                  {filteredTherapists.slice(0, 3).map((therapist) => (
                    <motion.div key={therapist._id} variants={cardVariants}>
                      <Link href={`/dashboard/therapists/${therapist._id}`}>
                        <SpecialistCard
                          name={therapist.name}
                          imageSrc={therapist.imageSrc || ""}
                          location={therapist.location || ""}
                          rating={therapist.rating || 0}
                          reviewCount={therapist.reviewCount || 0}
                          rate={therapist.rate || 0}
                        />
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                className="grid grid-cols-4 justify-center gap-4"
                variants={containerVariants}
              >
                <AnimatePresence>
                  {exampleSpecialists.map((therapist) => (
                    <motion.div key={therapist._id} variants={cardVariants}>
                      <Link href={`/dashboard/therapists/${therapist._id}`}>
                        <SpecialistCard
                          name={therapist.name}
                          imageSrc={therapist.imageSrc || ""}
                          location={therapist.location || ""}
                          rating={therapist.rating || 0}
                          reviewCount={therapist.reviewCount || 0}
                          rate={therapist.rate || 0}
                        />
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
