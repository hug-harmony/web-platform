"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CreditCard, Package, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import OrderItem from "@/components/merchandise/OrderItem";

const container = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.15 } },
};

export default function CheckoutPage() {
  const { cart, getTotal, clearCart, isLoading } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", address: "" });
  const [submitting, setSubmitting] = useState(false);

  const total = getTotal();

  const handleSubmit = async () => {
    if (!form.email || !form.address) {
      toast.error("Please fill in all fields");
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
        router.push("/dashboard/merchandise");
      } else {
        toast.error("Checkout failed – try again");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------- LOADING ----------------- */
  if (isLoading) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 bg-white/50" />
            <Skeleton className="h-4 w-64 mt-2 bg-white/50" />
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full rounded-md" />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  /* ----------------- MAIN UI ----------------- */
  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {/* Gradient Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="text-black dark:text-white hover:bg-white/20"
              >
                <Link href="/dashboard/merchandise/cart">
                  <ArrowLeft className="h-6 w-6" />
                </Link>
              </Button>

              <div>
                <CardTitle className="text-2xl font-bold text-black dark:text-white flex items-center">
                  <CreditCard className="mr-2 h-6 w-6" />
                  Checkout
                </CardTitle>
                <p className="text-sm opacity-80">Complete your order</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Order Summary */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Package className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnimatePresence>
            {cart.map((i) => (
              <OrderItem key={i.id} item={i} />
            ))}
          </AnimatePresence>

          <div className="border-t pt-3 flex justify-between items-center">
            <p className="font-bold text-black dark:text-white">Total</p>
            <p className="text-xl font-bold text-[#F3C 6]">
              ${total.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Shipping & Contact */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">
            Shipping & Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>

          <div>
            <Label htmlFor="address">Shipping Address</Label>
            <Input
              id="address"
              placeholder="123 Main St, City, Country"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>

          <Button
            size="lg"
            className="w-full bg-[#F3CFC6] hover:bg-[#F3CFC6]/90 text-black font-medium"
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
    </motion.div>
  );
}
