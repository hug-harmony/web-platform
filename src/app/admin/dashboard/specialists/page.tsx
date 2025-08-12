"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stethoscope, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  status: "active" | "pending";
}

const specialists: Specialist[] = [
  {
    id: "spec_1",
    name: "Dr. Sarah Johnson",
    specialty: "Therapist",
    status: "active",
  },
  {
    id: "spec_2",
    name: "Dr. Michael Brown",
    specialty: "Psychiatrist",
    status: "pending",
  },
];

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSpecialists = specialists.filter(
    (spec) =>
      (spec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spec.specialty.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "all" || spec.status === statusFilter)
  );

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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-[180px] border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
            aria-label="Filter by status"
          >
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-[#C4C4C4]">
              <AnimatePresence>
                {filteredSpecialists.map((spec) => (
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
                          <span
                            className={
                              spec.status === "active"
                                ? "text-green-500"
                                : "text-yellow-500"
                            }
                          >
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
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
