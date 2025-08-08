/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, CreditCard, Calendar, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Type definitions based on schema
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface Payment {
  id: string;
  specialist: {
    name: string;
    id: string;
  };
  amount: number;
  date: string;
  status: "pending" | "completed" | "failed";
  appointmentId?: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  lastFour: string;
  expiry: string;
}

// Dummy data
const payments: Payment[] = [
  {
    id: "pay_1",
    specialist: { name: "Dr. Sarah Johnson", id: "spec_1" },
    amount: 100,
    date: "2025-08-09",
    status: "pending",
    appointmentId: "appt_1",
  },
  {
    id: "pay_2",
    specialist: { name: "Dr. Michael Brown", id: "spec_2" },
    amount: 120,
    date: "2025-08-01",
    status: "completed",
    appointmentId: "appt_2",
  },
];

const paymentMethods: PaymentMethod[] = [
  {
    id: "method_1",
    type: "Visa",
    lastFour: "1234",
    expiry: "12/26",
  },
  {
    id: "method_2",
    type: "MasterCard",
    lastFour: "5678",
    expiry: "09/25",
  },
];

// Animation variants
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

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<"manage" | "history">("manage");
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return <div className="p-4">Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const user: User = {
    id: session?.user?.id || "user_1",
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "/assets/images/avatar-placeholder.png",
  };

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <Card>
        <CardHeader>
          <motion.div
            variants={itemVariants}
            className="flex items-center space-x-4"
          >
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">Payments</CardTitle>
              <p className="text-muted-foreground">
                Manage your payments and view history
              </p>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <motion.div variants={itemVariants}>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <MessageSquare className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button asChild variant="outline">
              <Link href="/dashboard/therapists">
                <Calendar className="mr-2 h-4 w-4" />
                Book Appointment
              </Link>
            </Button>
          </motion.div>
        </CardContent>
      </Card>

      {/* Payments Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5" />
            Payment Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "manage" | "history")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manage">Manage</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="manage">
              <motion.div className="space-y-6" variants={containerVariants}>
                {/* Upcoming Payments */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Upcoming Payments
                  </h3>
                  <ScrollArea className="h-[200px]">
                    <AnimatePresence>
                      {payments
                        .filter((p) => p.status === "pending")
                        .map((payment) => (
                          <motion.div
                            key={payment.id}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                          >
                            <div>
                              <p className="font-semibold">
                                {payment.specialist.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ${payment.amount} - Due {payment.date}
                              </p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/payment/${payment.id}`}>
                                Pay Now
                              </Link>
                            </Button>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </ScrollArea>
                </div>
                {/* Payment Methods */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Payment Methods
                  </h3>
                  <ScrollArea className="h-[200px]">
                    <AnimatePresence>
                      {paymentMethods.map((method) => (
                        <motion.div
                          key={method.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                        >
                          <div className="flex items-center space-x-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-semibold">{method.type}</p>
                              <p className="text-sm text-muted-foreground">
                                Ending in {method.lastFour} • Expires{" "}
                                {method.expiry}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </ScrollArea>
                  <Button variant="outline" className="mt-4">
                    Add Payment Method
                  </Button>
                </div>
              </motion.div>
            </TabsContent>
            <TabsContent value="history">
              <motion.div className="space-y-4" variants={containerVariants}>
                <AnimatePresence>
                  {payments
                    .filter((p) => p.status !== "pending")
                    .map((payment) => (
                      <motion.div
                        key={payment.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                      >
                        <div>
                          <p className="font-semibold">
                            {payment.specialist.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ${payment.amount} - {payment.date} -{" "}
                            {payment.status}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/payment/${payment.id}`}>Details</Link>
                        </Button>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </motion.div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
