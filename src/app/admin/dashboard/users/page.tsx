"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "suspended";
}

const users: User[] = [
  {
    id: "user_1",
    name: "John Doe",
    email: "john@example.com",
    status: "active",
  },
  {
    id: "user_2",
    name: "Jane Smith",
    email: "jane@example.com",
    status: "suspended",
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

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <Users className="mr-2 h-6 w-6" />
            Hug Harmony Users
          </CardTitle>
          <p className="text-sm opacity-80">Manage all registered users.</p>
        </CardHeader>
      </Card>

      {/* Search + Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
            aria-label="Search users"
          />
        </div>
        <Button
          variant="outline"
          className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
        >
          Filter by Status
        </Button>
      </div>

      {/* User List */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-[#C4C4C4]">
              <AnimatePresence>
                {filteredUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-[#C4C4C4] rounded-full flex items-center justify-center text-black dark:text-white">
                        {user.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-black dark:text-white">
                          {user.name}
                        </p>
                        <p className="text-sm text-[#C4C4C4]">
                          {user.email} •{" "}
                          <span
                            className={
                              user.status === "active"
                                ? "text-green-500"
                                : "text-red-500"
                            }
                          >
                            {user.status}
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
                      <Link href={`/admin/dashboard/users/${user.id}`}>
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
