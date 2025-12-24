// admin/professionals/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Stethoscope, Search } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";

interface Professional {
  id: string;
  professionalId: string;
  name: string;
  status: "active" | "pending";
  avatarUrl?: string | null;
  rate?: number;
  venue?: string;
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

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/professionals/applications?.[0]?status=APPROVED&search=${encodeURIComponent(
            searchTerm
          )}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (response.status === 401) {
          throw new Error("Unauthorized: Admin access required");
        }

        if (response.status === 404) {
          setProfessionals([]);
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Failed to fetch professionals: ${response.statusText}`
          );
        }

        const data = await response.json();
        const applications = Array.isArray(data) ? data : [];

        // FIXED: Removed reference to app.role which doesn't exist
        const formattedProfessionals: Professional[] = applications.map(
          (app: any) => ({
            id: app.id,
            professionalId: app.professionalId,
            name: app.name || "Unknown",
            status: app.status === "APPROVED" ? "active" : "pending",
            avatarUrl: app.avatarUrl ?? null,
            rate: app.rate,
            venue: app.venue,
          })
        );

        setProfessionals(formattedProfessionals);
      } catch (error: any) {
        console.error("Error fetching professionals:", error);
        setError(
          error.message || "Failed to load professionals. Please try again."
        );
        toast.error(
          error.message || "Failed to load professionals. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, [searchTerm]);

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <Stethoscope className="mr-2 h-6 w-6" />
            Hug Harmony Professionals
          </CardTitle>
          <p className="text-sm opacity-80">
            Manage all registered Professionals
          </p>
        </CardHeader>
      </Card>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
          <Input
            placeholder="Search professionals by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
            aria-label="Search professionals"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">{error}</div>
            ) : professionals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                  {professionals.map((spec) => (
                    <motion.div
                      key={spec.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors border border-[#C4C4C4] rounded"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[#C4C4C4] rounded-full flex items-center justify-center overflow-hidden text-black dark:text-white">
                          {spec.avatarUrl ? (
                            <Image
                              src={spec.avatarUrl}
                              alt={spec.name}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-black dark:text-white font-medium">
                              {spec.name[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white">
                            {spec.name}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            {spec.rate ? `$${spec.rate}/hr` : "Rate not set"}
                            {spec.venue && ` • ${spec.venue}`}
                            {" • "}
                            <span className="text-green-500">
                              {spec.status}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#fff]/80"
                      >
                        <Link
                          href={`/admin/dashboard/professionals/${spec.professionalId}`}
                        >
                          View
                        </Link>
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="p-4 text-center text-[#C4C4C4]">
                No approved professionals found
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
