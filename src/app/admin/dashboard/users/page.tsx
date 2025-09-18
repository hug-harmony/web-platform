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
import { Users, Search } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  id: string;
  name: string;
  email: string;
  profileImage: string;
  status: "active" | "suspended";
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // Explicitly type as string
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "all" || user.status === statusFilter)
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
            <Users className="mr-2 h-6 w-6" />
            Hug Harmony Users
          </CardTitle>
          <p className="text-sm opacity-80">Manage all registered users.</p>
        </CardHeader>
      </Card>

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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="p-4 text-center">Loading...</div>
            ) : (
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
                          <Avatar className="h-16 w-16 border-2 border-white">
                            <AvatarImage
                              src={
                                user.profileImage ||
                                "/assets/images/avatar-placeholder.png"
                              }
                              alt={user.name}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-[#C4C4C4] text-black">
                              {user.name[0]}
                            </AvatarFallback>
                          </Avatar>
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
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
