/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter } from "lucide-react";
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
  professionalId: string;
  startTime: string; // UPDATED: Replaced date
  endTime: string; // UPDATED: Replaced time
  venue?: "host" | "visit"; // NEW: Optional venue
  status: "pending" | "accepted" | "rejected";
  conversationId: string;
  user: { name: string };
  professional: { name: string; rate: number };
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function ProposalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isProfessional, setIsProfessional] = useState(false);
  const [loading, setLoading] = useState(true);
  const [receivedProposals, setReceivedProposals] = useState<Proposal[]>([]);
  const [sentProposals, setSentProposals] = useState<Proposal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const fetchProposals = async () => {
      if (!session?.user?.id) return;
      setLoading(true);
      try {
        const userQuery = new URLSearchParams({ role: "user" });
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
        setIsProfessional(userData.isProfessional);
        setReceivedProposals(
          Array.isArray(userData.proposals) ? userData.proposals : []
        );

        if (userData.isProfessional) {
          const professionalQuery = new URLSearchParams({
            role: "professional",
          });
          const professionalRes = await fetch(
            `/api/proposals?${professionalQuery}`,
            {
              cache: "no-store",
              credentials: "include",
            }
          );

          if (!professionalRes.ok) {
            if (professionalRes.status === 403) {
              toast.error("You are not authorized to view sent proposals");
              return;
            }
            throw new Error(
              `Failed to fetch sent proposals: ${professionalRes.status}`
            );
          }

          const professionalData = await professionalRes.json();
          setSentProposals(
            Array.isArray(professionalData.proposals)
              ? professionalData.proposals
              : []
          );
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
  }, [status, session, router]);

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

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const filterProposals = (proposals: Proposal[], isReceived: boolean) =>
    proposals
      .filter((proposal) =>
        searchQuery
          ? isReceived
            ? proposal.professional.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            : proposal.user.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
          : true
      )
      .filter((proposal) =>
        statusFilter ? proposal.status === statusFilter : true
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
              {[...Array(3)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-24 w-full bg-[#C4C4C4]/50 rounded-lg"
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
          <motion.div variants={cardVariants}>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Your Proposals
            </CardTitle>
            <p className="text-sm opacity-80">
              {filteredReceivedProposals.length} received
              {isProfessional ? `, ${filteredSentProposals.length} sent` : ""}
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
            <div className="flex space-x-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20 w-full sm:w-auto"
                  >
                    <Filter className="h-6 w-6 text-[#F3CFC6]" />
                    <span>Status</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800">
                  <DropdownMenuLabel className="text-black dark:text-white">
                    Filter by Status
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleStatusFilterChange("")}
                    className="text-black dark:text-white hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20"
                  >
                    All
                  </DropdownMenuItem>
                  {["pending", "accepted", "rejected"].map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusFilterChange(status)}
                      className="text-black dark:text-white hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20"
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Filter className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            All Proposals
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="received" className="w-full">
            <TabsList
              className={`grid w-full ${isProfessional ? "grid-cols-2" : "grid-cols-1"} bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20`}
            >
              <TabsTrigger
                value="received"
                className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black dark:data-[state=active]:text-white"
              >
                Received Proposals
              </TabsTrigger>
              {isProfessional && (
                <TabsTrigger
                  value="sent"
                  className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black dark:data-[state=active]:text-white"
                >
                  Sent Proposals
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="received">
              {filteredReceivedProposals.length === 0 ? (
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-center text-[#C4C4C4]"
                >
                  No received proposals found.
                </motion.div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6"
                  variants={containerVariants}
                >
                  <AnimatePresence>
                    {filteredReceivedProposals.map((proposal) => (
                      <motion.div
                        key={proposal.id}
                        variants={cardVariants}
                        whileHover={{
                          scale: 1.05,
                          boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <ProposalCard
                          proposal={proposal}
                          isReceived={true}
                          isProfessional={isProfessional}
                          onStatusUpdate={handleStatusUpdate}
                          onViewConversation={handleViewConversation}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </TabsContent>
            {isProfessional && (
              <TabsContent value="sent">
                {filteredSentProposals.length === 0 ? (
                  <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-center text-[#C4C4C4]"
                  >
                    No sent proposals found.
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6"
                    variants={containerVariants}
                  >
                    <AnimatePresence>
                      {filteredSentProposals.map((proposal) => (
                        <motion.div
                          key={proposal.id}
                          variants={cardVariants}
                          whileHover={{
                            scale: 1.05,
                            boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ProposalCard
                            proposal={proposal}
                            isReceived={false}
                            isProfessional={isProfessional}
                            onStatusUpdate={handleStatusUpdate}
                            onViewConversation={handleViewConversation}
                          />
                        </motion.div>
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
