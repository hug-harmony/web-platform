/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin } from "lucide-react";
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
import UserCard from "@/components/UserCard";

interface Therapist {
  _id: string;
  name: string;
  image?: string;
  location?: string;
  isSpecialist: boolean;
  specialistId?: string;
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

export default function ExplorePage() {
  const [users, setUsers] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ location: "" });

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
                .filter((user: any) => user.id)
                .map((user: any) => ({
                  _id: user.id,
                  name:
                    user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.name || "Unknown User",
                  image: user.profileImage || undefined,
                  location: user.location || "",
                  isSpecialist:
                    user.specialistApplication?.status === "approved" || false,
                  specialistId:
                    user.specialistApplication?.specialistId || undefined,
                }))
            : []
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const locations = Array.from(
    new Set(users.map((t) => t.location).filter(Boolean))
  ) as string[];

  const filterUsers = (data: Therapist[]) =>
    data
      .filter((item) => item._id)
      .filter((item) =>
        searchQuery
          ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
      .filter((item) =>
        filters.location ? item.location === filters.location : true
      );

  const filteredUsers = filterUsers(users);

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
              Explore Hug Harmony Users
            </CardTitle>
            <p className="text-sm opacity-80">Find and connect with users</p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center mb-6 w-full space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#fff]" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 w-full sm:w-auto"
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
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-black dark:text-white">
            All Users
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
          ) : filteredUsers.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
            >
              <AnimatePresence>
                {filteredUsers.map((user) => (
                  <motion.div
                    key={user._id}
                    variants={cardVariants}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      href={
                        user.isSpecialist
                          ? `/dashboard/specialists/${user.specialistId}`
                          : `/dashboard/users/${user._id}`
                      }
                    >
                      <UserCard
                        name={user.name}
                        imageSrc={user.image || ""}
                        isSpecialist={user.isSpecialist}
                        className="hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 transition-colors"
                      />
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <p className="text-center text-[#C4C4C4]">No users found.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
