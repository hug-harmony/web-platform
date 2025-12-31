// src/app/admin/dashboard/payments/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
import {
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  TrendingUp,
  Users,
  Loader2,
  FileWarning,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CycleStats {
  id: string;
  startDate: string;
  endDate: string;
  cutoffDate: string;
  status: string;
  totalEarnings: number;
  totalPlatformFees: number;
  totalNetAmount: number;
  earningsCount: number;
  professionalCount: number;
}

interface PayoutSummary {
  totalPayouts: number;
  pendingPayouts: number;
  processingPayouts: number;
  completedPayouts: number;
  failedPayouts: number;
  totalAmount: number;
  totalPlatformFees: number;
}

interface Dispute {
  id: string;
  appointmentId: string;
  clientConfirmed: boolean | null;
  professionalConfirmed: boolean | null;
  createdAt: string;
  appointment: {
    startTime: string;
    endTime: string;
    rate: number;
  };
  client: {
    name: string;
    email: string;
  };
  professional: {
    name: string;
  };
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function AdminPaymentsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentCycle, setCurrentCycle] = useState<CycleStats | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(
    null
  );
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Auth check
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    } else if (authStatus === "authenticated" && !session?.user?.isAdmin) {
      toast.error("Unauthorized");
      router.push("/dashboard");
    }
  }, [authStatus, session, router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/payments?view=overview", {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch payment data");

      const data = await response.json();
      setCurrentCycle(data.currentCycle);
      setPayoutSummary(data.payoutSummary);
      setDisputes(data.disputes || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load payment data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.isAdmin) {
      fetchData();
    }
  }, [authStatus, session, fetchData]);

  // Process payouts manually
  const handleProcessPayouts = async () => {
    if (processing) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/admin/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process_all" }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to process payouts");

      const result = await response.json();
      toast.success(
        `Processed ${result.totalPayoutsProcessed} payouts across ${result.cyclesProcessed} cycles`
      );
      fetchData();
    } catch (error) {
      console.error("Payout processing error:", error);
      toast.error("Failed to process payouts");
    } finally {
      setProcessing(false);
    }
  };

  // Resolve dispute
  const handleResolveDispute = async (
    disputeId: string,
    resolution: "admin_confirmed" | "admin_cancelled"
  ) => {
    try {
      const response = await fetch(
        `/api/admin/payments/disputes/${disputeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution }),
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to resolve dispute");

      toast.success(
        resolution === "admin_confirmed"
          ? "Dispute resolved: Appointment confirmed"
          : "Dispute resolved: Appointment cancelled"
      );
      setSelectedDispute(null);
      fetchData();
    } catch (error) {
      console.error("Dispute resolution error:", error);
      toast.error("Failed to resolve dispute");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F3CFC6]" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                Payment Management
              </CardTitle>
              <p className="text-sm text-black/70 mt-1">
                Manage earnings, payouts, and payment disputes
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchData}
                className="bg-white/80"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleProcessPayouts}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Process Payouts
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Current Cycle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#C4C4C4]">Current Cycle</span>
              <Calendar className="h-4 w-4 text-[#F3CFC6]" />
            </div>
            {currentCycle ? (
              <>
                <p className="text-lg font-bold text-black dark:text-white">
                  {formatDate(currentCycle.startDate)} -{" "}
                  {formatDate(currentCycle.endDate)}
                </p>
                <Badge
                  className={
                    currentCycle.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {currentCycle.status}
                </Badge>
              </>
            ) : (
              <p className="text-[#C4C4C4]">No active cycle</p>
            )}
          </CardContent>
        </Card>

        {/* Total Earnings */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#C4C4C4]">Cycle Earnings</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-black dark:text-white">
              {formatCurrency(currentCycle?.totalEarnings || 0)}
            </p>
            <p className="text-xs text-[#C4C4C4]">
              Platform fees:{" "}
              {formatCurrency(currentCycle?.totalPlatformFees || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Professionals */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#C4C4C4]">
                Active Professionals
              </span>
              <Users className="h-4 w-4 text-[#F3CFC6]" />
            </div>
            <p className="text-2xl font-bold text-black dark:text-white">
              {currentCycle?.professionalCount || 0}
            </p>
            <p className="text-xs text-[#C4C4C4]">
              {currentCycle?.earningsCount || 0} sessions this cycle
            </p>
          </CardContent>
        </Card>

        {/* Pending Disputes */}
        <Card className={disputes.length > 0 ? "border-yellow-400" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#C4C4C4]">Pending Disputes</span>
              <FileWarning
                className={`h-4 w-4 ${disputes.length > 0 ? "text-yellow-500" : "text-[#C4C4C4]"}`}
              />
            </div>
            <p className="text-2xl font-bold text-black dark:text-white">
              {disputes.length}
            </p>
            <p className="text-xs text-[#C4C4C4]">Require admin review</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="disputes">
                Disputes
                {disputes.length > 0 && (
                  <Badge className="ml-2 bg-yellow-500">
                    {disputes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="payouts">Payout Summary</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payout Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payout Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {payoutSummary ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            Pending
                          </span>
                          <span className="font-medium">
                            {payoutSummary.pendingPayouts}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 text-blue-500" />
                            Processing
                          </span>
                          <span className="font-medium">
                            {payoutSummary.processingPayouts}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Completed
                          </span>
                          <span className="font-medium">
                            {payoutSummary.completedPayouts}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            Failed
                          </span>
                          <span className="font-medium">
                            {payoutSummary.failedPayouts}
                          </span>
                        </div>
                        <div className="pt-3 border-t">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Total Paid Out</span>
                            <span className="font-bold text-green-600">
                              {formatCurrency(payoutSummary.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[#C4C4C4]">No payout data</p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Disputes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Recent Disputes
                      {disputes.length > 0 && (
                        <Badge variant="destructive">
                          {disputes.length} pending
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {disputes.length === 0 ? (
                      <div className="text-center py-8 text-[#C4C4C4]">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p>No pending disputes</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-3">
                          {disputes.slice(0, 5).map((dispute) => (
                            <div
                              key={dispute.id}
                              className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                              onClick={() => setSelectedDispute(dispute)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-black dark:text-white">
                                    {dispute.client.name} &{" "}
                                    {dispute.professional.name}
                                  </p>
                                  <p className="text-xs text-[#C4C4C4]">
                                    {formatDistanceToNow(
                                      new Date(dispute.createdAt),
                                      {
                                        addSuffix: true,
                                      }
                                    )}
                                  </p>
                                </div>
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Disputes Tab */}
            <TabsContent value="disputes">
              {disputes.length === 0 ? (
                <div className="text-center py-12 text-[#C4C4C4]">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg">No pending disputes</p>
                  <p className="text-sm">
                    All payment confirmations are in order
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parties</TableHead>
                      <TableHead>Appointment</TableHead>
                      <TableHead>Client Response</TableHead>
                      <TableHead>Professional Response</TableHead>
                      <TableHead>Created</TableHead>
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
                          className="border-b"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {dispute.client.name}
                              </p>
                              <p className="text-sm text-[#C4C4C4]">
                                & {dispute.professional.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{formatDate(dispute.appointment.startTime)}</p>
                              <p className="text-sm text-[#C4C4C4]">
                                {formatCurrency(dispute.appointment.rate || 0)}
                                /hr
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                dispute.clientConfirmed === true
                                  ? "bg-green-100 text-green-800"
                                  : dispute.clientConfirmed === false
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                              }
                            >
                              {dispute.clientConfirmed === true
                                ? "Occurred"
                                : dispute.clientConfirmed === false
                                  ? "Did Not Occur"
                                  : "No Response"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                dispute.professionalConfirmed === true
                                  ? "bg-green-100 text-green-800"
                                  : dispute.professionalConfirmed === false
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                              }
                            >
                              {dispute.professionalConfirmed === true
                                ? "Occurred"
                                : dispute.professionalConfirmed === false
                                  ? "Did Not Occur"
                                  : "No Response"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#C4C4C4]">
                            {formatDistanceToNow(new Date(dispute.createdAt), {
                              addSuffix: true,
                            })}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedDispute(dispute)}
                              className="border-[#F3CFC6] text-[#F3CFC6]"
                            >
                              Review
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="payouts">
              {payoutSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-yellow-50 dark:bg-yellow-900/20">
                    <CardContent className="p-4 text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                      <p className="text-2xl font-bold">
                        {payoutSummary.pendingPayouts}
                      </p>
                      <p className="text-sm text-[#C4C4C4]">Pending</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 dark:bg-blue-900/20">
                    <CardContent className="p-4 text-center">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">
                        {payoutSummary.processingPayouts}
                      </p>
                      <p className="text-sm text-[#C4C4C4]">Processing</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-900/20">
                    <CardContent className="p-4 text-center">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold">
                        {payoutSummary.completedPayouts}
                      </p>
                      <p className="text-sm text-[#C4C4C4]">Completed</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-900/20">
                    <CardContent className="p-4 text-center">
                      <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                      <p className="text-2xl font-bold">
                        {payoutSummary.failedPayouts}
                      </p>
                      <p className="text-sm text-[#C4C4C4]">Failed</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-center text-[#C4C4C4] py-8">
                  No payout data available
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dispute Resolution Dialog */}
      <Dialog
        open={!!selectedDispute}
        onOpenChange={() => setSelectedDispute(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Resolve Payment Dispute
            </DialogTitle>
            <DialogDescription>
              Review the details and decide whether the appointment occurred.
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              {/* Appointment Details */}
              <div className="p-4 bg-[#F3CFC6]/10 rounded-lg">
                <h4 className="font-medium mb-2">Appointment Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-[#C4C4C4]">Client:</span>
                    <p className="font-medium">{selectedDispute.client.name}</p>
                  </div>
                  <div>
                    <span className="text-[#C4C4C4]">Professional:</span>
                    <p className="font-medium">
                      {selectedDispute.professional.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#C4C4C4]">Date:</span>
                    <p className="font-medium">
                      {formatDate(selectedDispute.appointment.startTime)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#C4C4C4]">Rate:</span>
                    <p className="font-medium">
                      {formatCurrency(selectedDispute.appointment.rate || 0)}/hr
                    </p>
                  </div>
                </div>
              </div>

              {/* Responses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-[#C4C4C4] mb-1">Client says:</p>
                  <Badge
                    className={
                      selectedDispute.clientConfirmed === true
                        ? "bg-green-100 text-green-800"
                        : selectedDispute.clientConfirmed === false
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                    }
                  >
                    {selectedDispute.clientConfirmed === true
                      ? "✓ Occurred"
                      : selectedDispute.clientConfirmed === false
                        ? "✗ Did Not Occur"
                        : "No Response"}
                  </Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-[#C4C4C4] mb-1">
                    Professional says:
                  </p>
                  <Badge
                    className={
                      selectedDispute.professionalConfirmed === true
                        ? "bg-green-100 text-green-800"
                        : selectedDispute.professionalConfirmed === false
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                    }
                  >
                    {selectedDispute.professionalConfirmed === true
                      ? "✓ Occurred"
                      : selectedDispute.professionalConfirmed === false
                        ? "✗ Did Not Occur"
                        : "No Response"}
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-[#C4C4C4]">
                As an admin, you need to determine whether this appointment
                occurred and if the professional should be paid.
              </p>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() =>
                selectedDispute &&
                handleResolveDispute(selectedDispute.id, "admin_cancelled")
              }
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Did Not Occur (No Payment)
            </Button>
            <Button
              onClick={() =>
                selectedDispute &&
                handleResolveDispute(selectedDispute.id, "admin_confirmed")
              }
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Occurred (Process Payment)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
