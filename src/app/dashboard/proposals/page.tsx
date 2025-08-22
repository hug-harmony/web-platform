/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProposalCard from "@/components/ProposalCard";

interface Proposal {
  id: string;
  userId: string;
  specialistId: string;
  date: string;
  time: string;
  status: "pending" | "accepted" | "rejected";
  conversationId: string;
  user: { name: string };
  specialist: { name: string; rate: number };
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

export default function ProposalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [receivedProposals, setReceivedProposals] = useState<Proposal[]>([]);
  const [sentProposals, setSentProposals] = useState<Proposal[]>([]);
  const [filter, setFilter] = useState<"today" | "7d" | "30d" | "custom">("7d");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchProposals = async () => {
      if (!session?.user?.id) return;
      setLoading(true);
      try {
        // Construct query parameters
        const userQuery = new URLSearchParams({ role: "user", filter });
        const userRes = await fetch(`/api/proposals?${userQuery}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!userRes.ok) {
          if (userRes.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error(
            `Failed to fetch received proposals: ${userRes.status}`
          );
        }

        const userData = await userRes.json();
        setIsSpecialist(userData.isSpecialist);
        setReceivedProposals(userData.proposals);

        // Fetch sent proposals if specialist
        if (userData.isSpecialist) {
          const specialistQuery = new URLSearchParams({
            role: "specialist",
            filter,
          });
          const specialistRes = await fetch(
            `/api/proposals?${specialistQuery}`,
            {
              cache: "no-store",
              credentials: "include",
            }
          );

          if (!specialistRes.ok) {
            if (specialistRes.status === 403) {
              toast.error("You are not authorized to view sent proposals");
              return;
            }
            throw new Error(
              `Failed to fetch sent proposals: ${specialistRes.status}`
            );
          }

          const specialistData = await specialistRes.json();
          setSentProposals(specialistData.proposals);
        }
      } catch (error: any) {
        console.error("Fetch error:", error);
        toast.error("Failed to load proposals");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchProposals();
    }
  }, [status, session, filter, router]);

  const handleStatusUpdate = async (
    proposalId: string,
    status: "accepted" | "rejected"
  ) => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Failed to update proposal: ${res.status}`);
      }

      const { proposal, appointmentId } = await res.json();
      setReceivedProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId ? { ...p, status: proposal.status } : p
        )
      );
      toast.success(
        `Proposal ${status} successfully${appointmentId ? " and appointment created" : ""}`
      );
    } catch (error: any) {
      console.error("Error updating proposal:", error);
      toast.error("Failed to update proposal");
    }
  };

  const handleViewConversation = (conversationId: string) => {
    router.push(`/dashboard/messaging/${conversationId}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filterProposals = (proposals: Proposal[], isReceived: boolean) =>
    proposals.filter((proposal) =>
      searchQuery
        ? isReceived
          ? proposal.specialist.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : proposal.user.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  const filteredReceivedProposals = filterProposals(receivedProposals, true);
  const filteredSentProposals = filterProposals(sentProposals, false);

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
            <Skeleton className="h-4 w-64 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-40 bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-48 w-full bg-[#C4C4C4]/50 rounded-lg"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <motion.div
      className="space-y-6 w-full max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Proposals</CardTitle>
          <p className="text-sm opacity-80">
            {filteredReceivedProposals.length} received
            {isSpecialist ? `, ${filteredSentProposals.length} sent` : ""}
            {filter === "today"
              ? " (Today)"
              : filter === "7d"
                ? " (Last 7 days)"
                : filter === "30d"
                  ? " (Last 30 days)"
                  : " (Custom)"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6 w-full space-x-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#000]" />
              <Input
                type="text"
                placeholder="Search proposals..."
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
                  <Calendar className="h-6 w-6 text-[#F3CFC6]" />
                  <span>Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                <DropdownMenuLabel className="text-black dark:text-white">
                  Time Period
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setFilter("today")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("7d")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  Last 7 days
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("30d")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  Last 30 days
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilter("custom")}
                  className="text-black dark:text-white hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  Custom
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Proposals Content */}
      <Card className="shadow-lg gap-2">
        <CardHeader className="mb-0">
          <CardTitle className="text-lg font-semibold text-black dark:text-white">
            Proposals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="received" className="w-full">
            <TabsList
              className={`grid w-full ${isSpecialist ? "grid-cols-2" : "grid-cols-1"} bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20`}
            >
              <TabsTrigger
                value="received"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black dark:data-[state=active]:text-white"
              >
                Received Proposals
              </TabsTrigger>
              {isSpecialist && (
                <TabsTrigger
                  value="sent"
                  className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black dark:data-[state=active]:text-white"
                >
                  Sent Proposals
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="received mt-4">
              {filteredReceivedProposals.length === 0 ? (
                <p className="text-center text-[#C4C4C4]">
                  No received proposals found.
                </p>
              ) : (
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  variants={containerVariants}
                >
                  <AnimatePresence>
                    {filteredReceivedProposals.map((proposal) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        isReceived={true}
                        isSpecialist={isSpecialist}
                        onStatusUpdate={handleStatusUpdate}
                        onViewConversation={handleViewConversation}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </TabsContent>
            {isSpecialist && (
              <TabsContent value="sent">
                {filteredSentProposals.length === 0 ? (
                  <p className="text-center text-[#C4C4C4]">
                    No sent proposals found.
                  </p>
                ) : (
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    variants={containerVariants}
                  >
                    <AnimatePresence>
                      {filteredSentProposals.map((proposal) => (
                        <ProposalCard
                          key={proposal.id}
                          proposal={proposal}
                          isReceived={false}
                          isSpecialist={isSpecialist}
                          onStatusUpdate={handleStatusUpdate}
                          onViewConversation={handleViewConversation}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
