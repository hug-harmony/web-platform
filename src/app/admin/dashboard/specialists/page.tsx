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

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  status: "active" | "pending";
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

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecialists = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/specialists/application?status=approved&search=${encodeURIComponent(
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
          setSpecialists([]);
          return;
        }
        if (!response.ok) {
          throw new Error(
            `Failed to fetch specialists: ${response.statusText}`
          );
        }
        const data = await response.json();
        const applications = Array.isArray(data) ? data : [];
        const formattedSpecialists: Specialist[] = applications.map(
          (app: any) => ({
            id: app.id,
            name: app.name,
            specialty: app.role || "Unknown",
            status: app.status === "approved" ? "active" : "pending",
          })
        );
        setSpecialists(formattedSpecialists);
      } catch (error: any) {
        console.error("Error fetching specialists:", error);
        setError(
          error.message || "Failed to load specialists. Please try again."
        );
        toast.error(
          error.message || "Failed to load specialists. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchSpecialists();
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
            Hug Harmony Specialists
          </CardTitle>
          <p className="text-sm opacity-80">
            Manage all registered specialists.
          </p>
        </CardHeader>
      </Card>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
          <Input
            placeholder="Search specialists by name or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
            aria-label="Search specialists"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="p-4 text-center text-[#C4C4C4]">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">{error}</div>
            ) : specialists.length > 0 ? (
              <div className="divide-y divide-[#C4C4C4]">
                <AnimatePresence>
                  {specialists.map((spec) => (
                    <motion.div
                      key={spec.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[#C4C4C4] rounded-full flex items-center justify-center text-black dark:text-white">
                          {spec.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white">
                            {spec.name}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            {spec.specialty} •{" "}
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
                        className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                      >
                        <Link href={`/admin/dashboard/specialists/${spec.id}`}>
                          View
                        </Link>
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="p-4 text-center text-[#C4C4C4]">
                No approved specialists found
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
