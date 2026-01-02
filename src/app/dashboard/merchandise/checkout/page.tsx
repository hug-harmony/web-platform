"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CreditCard,
  Package,
  CheckCircle,
  DollarSign,
  Hash,
  MapPin,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import OrderItem from "@/components/merchandise/OrderItem";

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

export default function CheckoutPage() {
  const { cart, getTotal, clearCart, isLoading } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", address: "" });
  const [submitting, setSubmitting] = useState(false);

  const total = getTotal();

  // Stats
  const stats = useMemo(() => {
    const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    return {
      total,
      itemCount,
      uniqueItems: cart.length,
    };
  }, [cart, total]);

  const handleSubmit = async () => {
    if (!form.email || !form.address) {
      toast.error("Please fill in all fields");
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/merchandise/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, ...form }),
      });

      if (res.ok) {
        clearCart();
        toast.success("Order placed successfully!");
        router.push("/dashboard/orders");
      } else {
        toast.error("Checkout failed – try again");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <CheckoutPageSkeleton />;
  }

  // Empty cart redirect
  if (cart.length === 0) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="text-black hover:bg-white/20"
              >
                <Link href="/dashboard/merchandise">
                  <ArrowLeft className="h-6 w-6" />
                </Link>
              </Button>
              <div>
                <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Checkout
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">Your cart is empty</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 mb-4 opacity-30 text-gray-400" />
            <p className="text-gray-500 mb-6">Add items to your cart first</p>
            <Button
              asChild
              className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800"
            >
              <Link href="/dashboard/merchandise">
                <Package className="mr-2 h-4 w-4" />
                Browse Products
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader className="pb-2">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="text-black hover:bg-white/20"
                >
                  <Link href="/dashboard/merchandise/cart">
                    <ArrowLeft className="h-6 w-6" />
                  </Link>
                </Button>
                <div>
                  <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                    <CreditCard className="h-6 w-6" />
                    Checkout
                  </CardTitle>
                  <p className="text-sm text-black/70 mt-1">
                    Complete your order
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-[#F3CFC6]">
                ${stats.total.toFixed(2)}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" />
                Total
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.itemCount}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Hash className="h-3 w-3" />
                Items
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.uniqueItems}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Package className="h-3 w-3" />
                Products
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Summary */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <Package className="mr-2 h-5 w-5 text-[#F3CFC6]" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <OrderItem item={item} />
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="border-t pt-4 flex justify-between items-center">
              <p className="font-bold text-black">Total</p>
              <p className="text-2xl font-bold text-[#F3CFC6]">
                ${total.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping & Contact */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <MapPin className="mr-2 h-5 w-5 text-[#F3CFC6]" />
              Shipping & Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="focus:ring-[#F3CFC6] focus:border-[#F3CFC6]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                Shipping Address
              </Label>
              <Input
                id="address"
                placeholder="123 Main St, City, Country"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                className="focus:ring-[#F3CFC6] focus:border-[#F3CFC6]"
              />
            </div>

            <Button
              size="lg"
              className="w-full bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800 font-medium"
              onClick={handleSubmit}
              disabled={submitting || cart.length === 0}
            >
              {submitting ? (
                <>
                  <CheckCircle className="mr-2 h-5 w-5 animate-pulse" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pay Now – ${total.toFixed(2)}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// Skeleton loader
function CheckoutPageSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full bg-white/50" />
            <div>
              <Skeleton className="h-8 w-32 bg-white/50" />
              <Skeleton className="h-4 w-40 mt-2 bg-white/50" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg bg-white/50" />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
