// app/admin/dispute-handling/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, FileWarning } from "lucide-react";
import Link from "next/link";

interface DisputeAppointment {
  id: string;
  date: string;
  time: string;
  status: string;
  disputeReason: string | null;
  disputeStatus: string;
  adminNotes: string | null;
  user: { id: string; name: string; email: string; phoneNumber: string | null };
  professional: {
    id: string;
    name: string;
    application: { user: { name: string; email: string } };
  };
  payment: {
    id: string;
    amount: number;
    status: string;
    stripeId: string;
  } | null;
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

export default function DisputeHandlingPage() {
  const [disputes, setDisputes] = useState<DisputeAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] =
    useState<DisputeAppointment | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && !session?.user?.isAdmin) {
      toast.error("Unauthorized", {
        description: "Only admins can access this page.",
      });
      router.push("/dashboard");
      return;
    }
    fetchDisputes();
  }, [status, session, router]);

  const fetchDisputes = async () => {
    try {
      const res = await fetch("/api/disputes", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setDisputes(data);
      } else {
        toast.error("Error", {
          description: "Failed to fetch disputes",
        });
      }
    } catch (error) {
      console.error("Fetch disputes error:", error);
      toast.error("Error", {
        description: "Failed to fetch disputes",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "confirm_cancel" | "deny") => {
    if (!selectedDispute || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/disputes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDispute.id,
          action,
          notes: adminNotes || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Success", {
          description: `Dispute ${action === "confirm_cancel" ? "confirmed and canceled" : "denied"}`,
        });
        setSelectedDispute(null);
        setAdminNotes("");
        fetchDisputes();
      } else {
        const errorData = await res.json();
        toast.error("Error", {
          description: errorData.error || "Failed to update dispute",
        });
      }
    } catch (error) {
      console.error("Handle dispute error:", error);
      toast.error("Error", {
        description: "Failed to update dispute",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        className="space-y-6 max-w-7xl mx-auto p-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <div className="space-y-2">
              <div className="h-8 w-48 bg-[#C4C4C4]/50 rounded animate-pulse" />
              <div className="h-4 w-64 bg-[#C4C4C4]/50 rounded animate-pulse" />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-[#C4C4C4]/50 rounded animate-pulse"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <FileWarning className="mr-2 h-6 w-6" />
            Dispute Handling
          </CardTitle>
          <p className="text-sm opacity-80">
            Review and resolve disputed appointments.
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-4">
          <ScrollArea className="h-[500px]">
            {disputes.length === 0 ? (
              <div className="p-4 text-center text-[#C4C4C4]">
                No pending disputes found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Appointment</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Cuddler</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Dispute Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {disputes.map((dispute) => (
                      <motion.tr
                        key={dispute.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        className="border-[#C4C4C4]"
                      >
                        <TableCell>
                          <div>
                            {new Date(dispute.date).toLocaleDateString()}{" "}
                            {dispute.time}
                          </div>
                          <Badge variant="secondary">{dispute.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>{dispute.user.name}</div>
                          <div className="text-sm text-[#C4C4C4]">
                            {dispute.user.email}
                          </div>
                          {dispute.user.phoneNumber && (
                            <div className="text-sm text-[#C4C4C4]">
                              {dispute.user.phoneNumber}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>{dispute.professional.name}</div>
                          <div className="text-sm text-[#C4C4C4]">
                            {dispute.professional.application.user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {dispute.payment ? (
                            <div>
                              ${dispute.payment.amount} -{" "}
                              <Badge>{dispute.payment.status}</Badge>
                            </div>
                          ) : (
                            <span>No payment</span>
                          )}
                        </TableCell>
                        <TableCell>{dispute.disputeReason || "N/A"}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                                onClick={() => setSelectedDispute(dispute)}
                              >
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white dark:bg-black">
                              <DialogHeader>
                                <DialogTitle>
                                  Review Dispute: {dispute.id}
                                </DialogTitle>
                                <DialogDescription>
                                  <div className="space-y-2 text-black dark:text-white">
                                    <p>
                                      <strong>Client:</strong>{" "}
                                      {dispute.user.name} ({dispute.user.email})
                                    </p>
                                    <p>
                                      <strong>Cuddler:</strong>{" "}
                                      {dispute.professional.name} (
                                      {
                                        dispute.professional.application.user
                                          .email
                                      }
                                      )
                                    </p>
                                    <p>
                                      <strong>Date/Time:</strong>{" "}
                                      {new Date(
                                        dispute.date
                                      ).toLocaleDateString()}{" "}
                                      {dispute.time}
                                    </p>
                                    <p>
                                      <strong>Dispute Reason:</strong>{" "}
                                      {dispute.disputeReason}
                                    </p>
                                    {dispute.payment && (
                                      <p>
                                        <strong>Payment:</strong> $
                                        {dispute.payment.amount} (
                                        {dispute.payment.status})
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2 mt-4">
                                    <Label
                                      htmlFor="adminNotes"
                                      className="text-black dark:text-white"
                                    >
                                      Admin Notes
                                    </Label>
                                    <Textarea
                                      id="adminNotes"
                                      value={adminNotes}
                                      onChange={(e) =>
                                        setAdminNotes(e.target.value)
                                      }
                                      placeholder="Add notes (e.g., confirmation with client)"
                                      className="border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white"
                                    />
                                  </div>
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleAction("confirm_cancel")}
                                  disabled={submitting}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Confirm Cancel (Refund)
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleAction("deny")}
                                  disabled={submitting}
                                  className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                                >
                                  Deny Dispute
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Button
        asChild
        variant="link"
        className="text-[#F3CFC6] hover:text-[#F3CFC6]/80"
      >
        <Link href="/admin/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
    </motion.div>
  );
}
