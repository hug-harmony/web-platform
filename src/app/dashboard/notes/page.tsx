"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Notebook } from "lucide-react";
import Link from "next/link";
import Image from "next/image"; // Added for image handling
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Target {
  id: string;
  type: "user" | "professional";
  name: string;
  image: string | null; // Added for profile image
  noteCount: number;
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

export default function NotesPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      const fetchData = async () => {
        try {
          const res = await fetch("/api/notes/targets", {
            cache: "no-store",
            credentials: "include",
          });
          if (!res.ok) {
            throw new Error(`Failed to fetch targets: ${res.status}`);
          }
          const targetsData = await res.json();
          setTargets(Array.isArray(targetsData) ? targetsData : []);
        } catch (error) {
          console.error("Error fetching data:", error);
          toast.error("Failed to fetch noted profiles");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [status, session]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
  };

  const filterTargets = (data: Target[]) =>
    data
      .filter((target) =>
        searchQuery
          ? target.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
      .filter((target) => (typeFilter ? target.type === typeFilter : true));

  const filteredTargets = filterTargets(targets);

  if (status === "loading" || loading) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
            <Skeleton className="h-4 w-64 mt-2 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Skeleton className="h-10 w-full sm:w-2/3 bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full sm:w-1/3 bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, idx) => (
                <Skeleton
                  key={idx}
                  className="h-32 w-full bg-[#C4C4C4]/50 rounded-lg"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Your Noted Profiles
            </CardTitle>
            <p className="text-sm opacity-80">
              View profiles you have notes on
            </p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center mb-6 w-full space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#fff]" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20 w-full sm:w-auto"
                >
                  <Filter className="h-6 w-6 text-[#F3CFC6]" />
                  <span>Type</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                <DropdownMenuLabel className="text-black dark:text-white">
                  Filter by Type
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleTypeFilterChange("")}
                  className="text-black dark:text-white hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20"
                >
                  All
                </DropdownMenuItem>
                {["user", "professional"].map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => handleTypeFilterChange(type)}
                    className="text-black dark:text-white hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Notebook className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            Noted Profiles ({filteredTargets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <motion.div className="space-y-6" variants={containerVariants}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredTargets.length > 0 ? (
                  filteredTargets.map((target) => (
                    <motion.div
                      key={`${target.type}-${target.id}`}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      layout
                    >
                      <Link
                        href={`/dashboard/notes/${target.type}/${target.id}`}
                      >
                        <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                          <CardContent className="p-4 space-y-4">
                            <div className="flex items-center space-x-4">
                              {target.image ? (
                                <div className="w-12 h-12 rounded-full overflow-hidden">
                                  <Image
                                    src={target.image}
                                    alt={target.name}
                                    width={48}
                                    height={48}
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-[#F3CFC6] flex items-center justify-center text-black text-xl font-bold">
                                  {target.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-black dark:text-white">
                                  {target.name}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="mt-1 text-xs text-[#F3CFC6] border-[#F3CFC6]"
                                >
                                  {target.type.charAt(0).toUpperCase() +
                                    target.type.slice(1)}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-[#C4C4C4]">
                              {target.noteCount} note
                              {target.noteCount !== 1 ? "s" : ""}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-center text-[#C4C4C4] col-span-full">
                    No noted profiles found. Add notes from user or professional
                    profiles.
                  </p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
