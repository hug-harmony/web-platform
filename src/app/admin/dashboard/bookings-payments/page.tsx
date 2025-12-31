// src\app\admin\dashboard\bookings-payments\page.tsx
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
import { Calendar, Search } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Booking {
  _id: string;
  date: string;
  time: string;
  cuddlerName: string;
  clientName: string;
  status: "booked" | "canceled" | "no-show";
}

interface Payment {
  id: string;
  status: "successful" | "failed" | "disputed";
  amount: number;
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

export default function BookingsPaymentsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([
    { id: "pay_001", status: "successful", amount: 50.0 },
    { id: "pay_002", status: "disputed", amount: 75.0 },
    { id: "pay_003", status: "failed", amount: 30.0 },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [offSiteAlert, setOffSiteAlert] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/appointment?admin=true");
        if (!response.ok) {
          throw new Error("Failed to fetch bookings");
        }
        const data = await response.json();
        setBookings(data);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        toast.error("Failed to fetch bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
    setOffSiteAlert(Math.random() > 0.8); // Mock off-site detection
  }, []);

  const filteredBookings = bookings.filter(
    (booking) =>
      (booking.cuddlerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.date.includes(searchTerm)) &&
      (statusFilter === "all" || booking.status === statusFilter)
  );

  const handleResolveDispute = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, refund: true }),
      });
      if (response.ok) {
        toast.success("Dispute resolved");
        setPayments(payments.filter((p) => p.id !== paymentId));
        setSelectedPayment(null);
        console.log(selectedPayment);
        setNotes("");
      } else {
        throw new Error("Failed to resolve dispute");
      }
    } catch (error) {
      console.error("Error resolving dispute:", error);
      toast.error("Failed to resolve dispute");
    }
  };

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
            <Calendar className="mr-2 h-6 w-6" />
            Bookings & Payments
          </CardTitle>
          <p className="text-sm opacity-80">Manage bookings and payments.</p>
        </CardHeader>
      </Card>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
          <Input
            placeholder="Search by name or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
            aria-label="Search bookings"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#fff]/80">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="no-show">No-Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {offSiteAlert && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Off-Site Booking Detected</AlertTitle>
          <AlertDescription>
            A user attempted to book outside the website. Review and take
            action.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="p-4 text-center">Loading...</div>
            ) : (
              <div className="divide-y divide-[#C4C4C4]">
                <AnimatePresence>
                  {filteredBookings.map((booking) => (
                    <motion.div
                      key={booking._id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border-2 border-white">
                          <AvatarImage
                            src="/assets/images/avatar-placeholder.png"
                            alt={booking.cuddlerName}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-[#C4C4C4] text-black">
                            {booking.cuddlerName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-black dark:text-white">
                            {booking.cuddlerName} & {booking.clientName}
                          </p>
                          <p className="text-sm text-[#C4C4C4]">
                            {booking.date} • {booking.time} •{" "}
                            <span
                              className={
                                booking.status === "booked"
                                  ? "text-green-500"
                                  : "text-red-500"
                              }
                            >
                              {booking.status}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#fff]/80"
                      >
                        <Link
                          href={`/admin/dashboard/bookings-payments/${booking._id}`}
                        >
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

      <Card>
        <CardHeader>
          <CardTitle>Payment Statuses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            <div className="divide-y divide-[#C4C4C4]">
              <AnimatePresence>
                {payments.map((payment) => (
                  <motion.div
                    key={payment.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-black dark:text-white">
                        Payment {payment.id}
                      </p>
                      <p className="text-sm text-[#C4C4C4]">
                        Amount: ${payment.amount} •{" "}
                        <span
                          className={
                            payment.status === "successful"
                              ? "text-green-500"
                              : payment.status === "failed"
                                ? "text-red-500"
                                : "text-yellow-500"
                          }
                        >
                          {payment.status}
                        </span>
                      </p>
                    </div>
                    {payment.status === "disputed" && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#fff]/80"
                          >
                            Resolve
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white dark:bg-black">
                          <DialogHeader>
                            <DialogTitle>Resolve Dispute</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="notes">Notes</Label>
                              <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
                              />
                            </div>
                            <Button
                              onClick={() => handleResolveDispute(payment.id)}
                              className="bg-[#F3CFC6] text-black hover:bg-[#C4C4C4]"
                            >
                              Refund and Resolve
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
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
