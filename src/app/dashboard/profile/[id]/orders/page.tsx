"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ArrowLeft, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import OrderCard from "@/components/merchandise/OrderCard";

interface OrderItem {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
}

interface Order {
  id: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function UserOrdersPage() {
  const { id } = useParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/users/${id}/orders`);
        if (!res.ok) throw new Error("Failed to load orders");
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("Could not load orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrders();
  }, [id]);

  // === LOADING SKELETON ===
  if (loading) {
    return (
      <motion.div
        className="space-y-6 w-full max-w-4xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-white/50" />
            <Skeleton className="h-4 w-64 mt-2 bg-white/50" />
          </CardHeader>
        </Card>

        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    );
  }

  // === ERROR STATE ===
  if (error) {
    return (
      <motion.div
        className="space-y-6 w-full max-w-4xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Orders
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="text-center py-12">
          <p className="text-[#C4C4C4] mb-4">{error}</p>
          <Button asChild>
            <Link href={`/dashboard/profile/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Link>
          </Button>
        </Card>
      </motion.div>
    );
  }

  // === MAIN UI ===
  return (
    <motion.div
      className="space-y-6 w-full max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Gradient Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="text-black dark:text-white hover:bg-white/20"
              >
                <Link href={`/dashboard/profile/${id}`}>
                  <ArrowLeft className="h-6 w-6" />
                </Link>
              </Button>
              <div>
                <CardTitle className="text-2xl font-bold text-black dark:text-white flex items-center">
                  <Package className="mr-2 h-6 w-6" />
                  My Orders
                </CardTitle>
                <p className="text-sm opacity-80">
                  {orders.length} {orders.length === 1 ? "order" : "orders"}
                </p>
              </div>
            </div>
          </motion.div>
        </CardHeader>
      </Card>

      {/* Orders List */}
      <AnimatePresence>
        {orders.length === 0 ? (
          <motion.div variants={itemVariants}>
            <Card className="text-center py-12 shadow-lg">
              <CardContent>
                <PackageOpen className="h-16 w-16 mx-auto text-[#C4C4C4] mb-4" />
                <p className="text-[#C4C4C4] text-lg">No orders yet.</p>
                <p className="text-sm mt-2">
                  <Link
                    href="/dashboard/merchandise"
                    className="text-[#F3CFC6] hover:underline"
                  >
                    Start shopping
                  </Link>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
