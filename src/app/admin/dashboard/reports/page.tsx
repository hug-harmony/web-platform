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
import { AlertCircle, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Report {
  id: string;
  reporter: string;
  reported: string;
  status: "open" | "closed";
}

const reports: Report[] = [
  { id: "rep_1", reporter: "John Doe", reported: "Jane Smith", status: "open" },
  {
    id: "rep_2",
    reporter: "Alice Green",
    reported: "Bob White",
    status: "closed",
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

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredReports = reports.filter(
    (rep) =>
      (rep.reporter.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rep.reported.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "all" || rep.status === statusFilter)
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
            <AlertCircle className="mr-2 h-6 w-6" />
            Hug Harmony User Reports
          </CardTitle>
          <p className="text-sm opacity-80">
            Review and manage user-submitted reports.
          </p>
        </CardHeader>
      </Card>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
          <Input
            placeholder="Search reports by reporter or reported user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
            aria-label="Search reports"
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
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-[#C4C4C4]">
              <AnimatePresence>
                {filteredReports.map((rep) => (
                  <motion.div
                    key={rep.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-[#C4C4C4] rounded-full flex items-center justify-center text-black dark:text-white">
                        {rep.reporter[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-black dark:text-white">
                          {rep.reporter} reported {rep.reported}
                        </p>
                        <p className="text-sm text-[#C4C4C4]">
                          <span
                            className={
                              rep.status === "open"
                                ? "text-yellow-500"
                                : "text-green-500"
                            }
                          >
                            {rep.status}
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
                      <Link href={`/admin/dashboard/reports/${rep.id}`}>
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
