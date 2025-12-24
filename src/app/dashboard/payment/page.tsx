/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, CreditCard, Search, Filter } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Payment {
  id: string;
  professional: { name: string; id: string };
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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<"manage" | "history">("manage");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      const fetchData = async () => {
        try {
          // Fetch payments
          const paymentsRes = await fetch("/api/payments", {
            cache: "no-store",
            credentials: "include",
          });
          if (!paymentsRes.ok) {
            throw new Error(`Failed to fetch payments: ${paymentsRes.status}`);
          }
          const paymentsData = await paymentsRes.json();
          setPayments(
            Array.isArray(paymentsData)
              ? paymentsData.map((payment: any) => ({
                  id: payment.id || "",
                  professional: {
                    name: payment.professional?.name || "Unknown Professional",
                    id: payment.professional?.id || "",
                  },
                  amount: payment.amount || 0,
                  date: payment.date || "",
                  status: payment.status || "pending",
                  appointmentId: payment.appointmentId || undefined,
                }))
              : []
          );

          // Fetch payment methods
          const methodsRes = await fetch("/api/payment-methods", {
            cache: "no-store",
            credentials: "include",
          });
          if (!methodsRes.ok) {
            throw new Error(
              `Failed to fetch payment methods: ${methodsRes.status}`
            );
          }
          const methodsData = await methodsRes.json();
          setPaymentMethods(
            Array.isArray(methodsData)
              ? methodsData.map((method: any) => ({
                  id: method.id || "",
                  type: method.type || "Unknown",
                  lastFour: method.lastFour || "****",
                  expiry: method.expiry || "",
                }))
              : []
          );
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [status, session]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const filterPayments = (data: Payment[]) =>
    data
      .filter((payment) =>
        searchQuery
          ? payment.professional.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : true
      )
      .filter((payment) =>
        statusFilter ? payment.status === statusFilter : true
      );

  const filteredPayments = filterPayments(payments);

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
              {[...Array(3)].map((_, idx) => (
                <Skeleton
                  key={idx}
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
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Your Payments
            </CardTitle>
            <p className="text-sm opacity-80">
              Manage your payments and view history
            </p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center mb-6 w-full space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[#fff]" />
              <Input
                type="text"
                placeholder="Search by professional name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
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
                {["pending", "completed", "failed"].map((status) => (
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
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <DollarSign className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            Payment Management
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "manage" | "history")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20">
              <TabsTrigger value="manage">
                Manage (
                {paymentMethods.length +
                  filteredPayments.filter((p) => p.status === "pending").length}
                )
              </TabsTrigger>
              <TabsTrigger value="history">
                History (
                {filteredPayments.filter((p) => p.status !== "pending").length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="manage">
              <motion.div className="space-y-6" variants={containerVariants}>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
                    Upcoming Payments
                  </h3>
                  <ScrollArea className="h-[200px]">
                    <AnimatePresence>
                      {filteredPayments.filter((p) => p.status === "pending")
                        .length > 0 ? (
                        filteredPayments
                          .filter((p) => p.status === "pending")
                          .map((payment) => (
                            <motion.div
                              key={payment.id}
                              variants={cardVariants}
                              whileHover={{
                                scale: 1.05,
                                boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                            >
                              <div>
                                <p className="font-semibold text-black dark:text-white">
                                  {payment.professional.name}
                                </p>
                                <p className="text-sm text-[#C4C4C4]">
                                  ${payment.amount} - Due {payment.date}
                                </p>
                              </div>
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20"
                              >
                                <Link href={`/payment/${payment.id}`}>
                                  Pay Now
                                </Link>
                              </Button>
                            </motion.div>
                          ))
                      ) : (
                        <p className="text-center text-[#C4C4C4]">
                          No upcoming payments found.
                        </p>
                      )}
                    </AnimatePresence>
                  </ScrollArea>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
                    Payment Methods
                  </h3>
                  <ScrollArea className="h-[200px]">
                    <AnimatePresence>
                      {paymentMethods.length > 0 ? (
                        paymentMethods.map((method) => (
                          <motion.div
                            key={method.id}
                            variants={cardVariants}
                            whileHover={{
                              scale: 1.05,
                              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                            }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                          >
                            <div className="flex items-center space-x-3">
                              <CreditCard className="h-6 w-6 text-[#F3CFC6]" />
                              <div>
                                <p className="font-semibold text-black dark:text-white">
                                  {method.type}
                                </p>
                                <p className="text-sm text-[#C4C4C4]">
                                  Ending in {method.lastFour} • Expires{" "}
                                  {method.expiry}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20"
                            >
                              Edit
                            </Button>
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-center text-[#C4C4C4]">
                          No payment methods found.
                        </p>
                      )}
                    </AnimatePresence>
                  </ScrollArea>
                  <Button
                    variant="outline"
                    className="mt-4 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20"
                  >
                    Add Payment Method
                  </Button>
                </div>
              </motion.div>
            </TabsContent>
            <TabsContent value="history">
              <motion.div className="space-y-4" variants={containerVariants}>
                <AnimatePresence>
                  {filteredPayments.filter((p) => p.status !== "pending")
                    .length > 0 ? (
                    filteredPayments
                      .filter((p) => p.status !== "pending")
                      .map((payment) => (
                        <motion.div
                          key={payment.id}
                          variants={cardVariants}
                          whileHover={{
                            scale: 1.05,
                            boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                          }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-between p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 rounded-md"
                        >
                          <div>
                            <p className="font-semibold text-black dark:text-white">
                              {payment.professional.name}
                            </p>
                            <p className="text-sm text-[#C4C4C4]">
                              ${payment.amount} - {payment.date} -{" "}
                              {payment.status}
                            </p>
                          </div>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20"
                          >
                            <Link href={`/payment/${payment.id}`}>Details</Link>
                          </Button>
                        </motion.div>
                      ))
                  ) : (
                    <p className="text-center text-[#C4C4C4]">
                      No payment history found.
                    </p>
                  )}
                </AnimatePresence>
              </motion.div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
