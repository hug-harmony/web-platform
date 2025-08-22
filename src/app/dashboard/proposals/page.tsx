/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface Proposal {
  id: string;
  userId: string;
  specialistId: string;
  date: string;
  time: string;
  status: "pending" | "accept" | "reject";
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

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const ProposalsPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientProposals, setClientProposals] = useState<Proposal[]>([]);
  const [sentProposals, setSentProposals] = useState<Proposal[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    const checkSpecialistStatus = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch("/api/specialists/application/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (res.ok) {
          const { status } = await res.json();
          setIsSpecialist(status === "approved");
        } else {
          console.error(
            "Failed to fetch specialist status:",
            res.status,
            await res.text()
          );
          throw new Error(`Failed to fetch specialist status: ${res.status}`);
        }
      } catch (error) {
        console.error("Error checking specialist status:", error);
        toast.error("Failed to verify specialist status");
      }
    };

    const fetchProposals = async () => {
      if (!session?.user?.id) return;
      setLoading(true);
      try {
        if (isSpecialist) {
          const [clientRes, allRes] = await Promise.all([
            fetch("/api/proposals/client", {
              cache: "no-store",
              credentials: "include",
            }),
            fetch("/api/proposals/all", {
              cache: "no-store",
              credentials: "include",
            }),
          ]);

          if (!clientRes.ok) {
            console.error(
              "Client proposals fetch failed:",
              clientRes.status,
              await clientRes.text()
            );
            if (clientRes.status === 401) {
              router.push("/login");
              return;
            }
            if (clientRes.status === 403) {
              toast.error("You are not authorized to view client proposals");
              return;
            }
            throw new Error(
              `Client proposals fetch failed: ${clientRes.status}`
            );
          }
          if (!allRes.ok) {
            console.error(
              "All proposals fetch failed:",
              allRes.status,
              await allRes.text()
            );
            if (allRes.status === 401) {
              router.push("/login");
              return;
            }
            throw new Error(`All proposals fetch failed: ${allRes.status}`);
          }

          const clientData = await clientRes.json();
          const allData = await allRes.json();
          console.log("Client proposals:", clientData);
          console.log("All proposals:", allData);

          setClientProposals(
            clientData.filter((p: Proposal) => p.status !== "pending")
          );
          setSentProposals(
            allData.sent?.filter((p: Proposal) => p.status !== "pending") || []
          );
        } else {
          const res = await fetch("/api/proposals/all", {
            cache: "no-store",
            credentials: "include",
          });
          if (!res.ok) {
            console.error(
              "Proposals fetch failed:",
              res.status,
              await res.text()
            );
            if (res.status === 401) {
              router.push("/login");
              return;
            }
            throw new Error(`Proposals fetch failed: ${res.status}`);
          }
          const data = await res.json();
          console.log("Proposals:", data);
          setClientProposals(
            data.filter((p: Proposal) => p.status !== "pending")
          );
        }
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Failed to load proposals");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      checkSpecialistStatus();
      fetchProposals();
    }
  }, [status, session, isSpecialist, router]);

  const handleDateRangeChange = (key: "start" | "end", value: string) => {
    setDateRange((prev) => ({ ...prev, [key]: value }));
  };

  const filterByDateRange = (data: Proposal[]) =>
    data.filter((item) => {
      if (!item.date) return true;
      const proposalDate = new Date(item.date);
      const start = dateRange.start ? new Date(dateRange.start) : null;
      const end = dateRange.end ? new Date(dateRange.end) : null;
      return (!start || proposalDate >= start) && (!end || proposalDate <= end);
    });

  const handleViewConversation = (conversationId: string) => {
    router.push(`/dashboard/messaging/${conversationId}`);
  };

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
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
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

  const filteredClientProposals = filterByDateRange(clientProposals);
  const filteredSentProposals = filterByDateRange(sentProposals);

  const renderProposalCard = (proposal: Proposal) => (
    <motion.div key={proposal.id} variants={itemVariants}>
      <Card className="border-[#F3CFC6] hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-2">
            <p className="text-lg font-medium text-[#333]">
              {isSpecialist
                ? `Client: ${proposal.user.name}`
                : `Specialist: ${proposal.specialist.name}`}
            </p>
            <p className="text-sm text-[#C4C4C4]">
              Date: {format(new Date(proposal.date), "MMMM d, yyyy")}
            </p>
            <p className="text-sm text-[#C4C4C4]">Time: {proposal.time}</p>
            <p className="text-sm text-[#C4C4C4]">
              Status: {proposal.status === "accept" ? "Accepted" : "Rejected"}
            </p>
            {isSpecialist && (
              <p className="text-sm text-[#C4C4C4]">
                Amount: ${proposal.specialist.rate.toFixed(2)}
              </p>
            )}
            <Button
              onClick={() => handleViewConversation(proposal.conversationId)}
              variant="outline"
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6] hover:text-white rounded-full mt-2"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              View Conversation
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

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
            <CardTitle className="text-2xl text-black dark:text-white">
              Proposals
            </CardTitle>
            <p className="text-sm text-[#C4C4C4]">Manage your proposals</p>
          </motion.div>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <motion.div
            variants={itemVariants}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
            }}
            transition={{ duration: 0.2 }}
          >
            <Button
              asChild
              variant="outline"
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
            >
              <Link href="/dashboard">
                <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                Back to Dashboard
              </Link>
            </Button>
          </motion.div>
          <div className="relative flex-grow">
            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#fff]" />
            <Input
              type="date"
              placeholder="Start Date"
              value={dateRange.start}
              onChange={(e) => handleDateRangeChange("start", e.target.value)}
              className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
            />
          </div>
          <div className="relative flex-grow">
            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#fff]" />
            <Input
              type="date"
              placeholder="End Date"
              value={dateRange.end}
              onChange={(e) => handleDateRangeChange("end", e.target.value)}
              className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="pt-6">
          {isSpecialist ? (
            <Tabs defaultValue="client" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="client">Client Proposals</TabsTrigger>
                <TabsTrigger value="sent">My Proposals</TabsTrigger>
              </TabsList>
              <TabsContent value="client">
                {filteredClientProposals.length === 0 ? (
                  <p className="text-center text-[#C4C4C4]">
                    No client proposals found.
                  </p>
                ) : (
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    variants={containerVariants}
                  >
                    <AnimatePresence>
                      {filteredClientProposals.map(renderProposalCard)}
                    </AnimatePresence>
                  </motion.div>
                )}
              </TabsContent>
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
                      {filteredSentProposals.map(renderProposalCard)}
                    </AnimatePresence>
                  </motion.div>
                )}
              </TabsContent>
            </Tabs>
          ) : filteredClientProposals.length === 0 ? (
            <p className="text-center text-[#C4C4C4]">No proposals found.</p>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              variants={containerVariants}
            >
              <AnimatePresence>
                {filteredClientProposals.map(renderProposalCard)}
              </AnimatePresence>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProposalsPage;
