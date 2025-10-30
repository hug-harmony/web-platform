"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import CartItem from "@/components/merchandise/CartItem";

const container = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.15 } },
};

export default function CartPage() {
  const { cart, getTotal, removeFromCart, updateQuantity, isLoading } =
    useCart();

  const total = getTotal();

  /* ----------------- EMPTY STATE ----------------- */
  if (cart.length === 0) {
    return (
      <motion.div
        className="space-y-6 max-w-2xl mx-auto text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Your Cart is Empty
            </CardTitle>
            <p className="text-sm opacity-80">Add some cool merch!</p>
          </CardHeader>
        </Card>

        <Button asChild size="lg">
          <Link href="/dashboard/merchandise">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Continue Shopping
          </Link>
        </Button>
      </motion.div>
    );
  }

  /* ----------------- LOADING ----------------- */
  if (isLoading) {
    return (
      <motion.div
        className="space-y-6 w-full max-w-4xl mx-auto"
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
          <CardContent className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 border rounded"
              >
                <Skeleton className="h-16 w-16 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-10 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  /* ----------------- MAIN UI ----------------- */
  return (
    <motion.div
      className="space-y-6 w-full max-w-4xl mx-auto"
      variants={container}
      initial="hidden"
      animate="_hover"
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
                <Link href="/dashboard/merchandise">
                  <ArrowLeft className="h-6 w-6" />
                </Link>
              </Button>

              <div>
                <CardTitle className="text-2xl font-bold text-black dark:text-white flex items-center">
                  <ShoppingCart className="mr-2 h-6 w-6" />
                  Your Cart
                </CardTitle>
                <p className="text-sm opacity-80">
                  {cart.length} {cart.length === 1 ? "item" : "items"}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Items */}
      <Card className="shadow-lg">
        <CardContent className="p-6 space-y-4">
          <AnimatePresence>
            {cart.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onRemove={() => {
                  removeFromCart(item.id);
                  toast.success("Removed from cart");
                }}
                onUpdate={(newQty) => updateQuantity(item.id, newQty)}
              />
            ))}
          </AnimatePresence>

          {/* Total + Checkout */}
          <div className="border-t pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xl font-bold text-black dark:text-white">
              Total: <span className="text-[#F3CFC6]">${total.toFixed(2)}</span>
            </p>

            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/dashboard/merchandise/checkout">
                Proceed to Checkout
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
