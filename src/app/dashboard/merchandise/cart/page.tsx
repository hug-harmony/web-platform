"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  DollarSign,
  Hash,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import CartItem from "@/components/merchandise/CartItem";

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

export default function CartPage() {
  const {
    cart,
    getTotal,
    removeFromCart,
    updateQuantity,
    clearCart,
    isLoading,
  } = useCart();

  const total = getTotal();

  // Stats
  const stats = useMemo(() => {
    const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const uniqueItems = cart.length;

    return {
      total,
      itemCount,
      uniqueItems,
      avgPrice: uniqueItems > 0 ? total / itemCount : 0,
    };
  }, [cart, total]);

  // Loading state
  if (isLoading) {
    return <CartPageSkeleton />;
  }

  // Empty state
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
                  <ShoppingCart className="h-6 w-6" />
                  Your Cart is Empty
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  Add some cool merch to get started!
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-16 w-16 mb-4 opacity-30 text-gray-400" />
            <p className="text-gray-500 mb-6">Your cart is empty</p>
            <Button
              asChild
              className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800"
            >
              <Link href="/dashboard/merchandise">
                <Package className="mr-2 h-4 w-4" />
                Continue Shopping
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
                  <Link href="/dashboard/merchandise">
                    <ArrowLeft className="h-6 w-6" />
                  </Link>
                </Button>
                <div>
                  <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                    <ShoppingCart className="h-6 w-6" />
                    Your Cart
                  </CardTitle>
                  <p className="text-sm text-black/70 mt-1">
                    {stats.itemCount} {stats.itemCount === 1 ? "item" : "items"}{" "}
                    in your cart
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearCart();
                  toast.success("Cart cleared");
                }}
                className="rounded-full bg-white/80 hover:bg-white text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cart
              </Button>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                ${stats.avgPrice.toFixed(2)}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" />
                Avg/Item
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cart Items */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black">
            <Package className="mr-2 h-5 w-5 text-[#F3CFC6]" />
            Cart Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                key={item.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: -20 }}
                layout
              >
                <CartItem
                  item={item}
                  onRemove={() => {
                    removeFromCart(item.id);
                    toast.success("Removed from cart");
                  }}
                  onUpdate={(newQty) => updateQuantity(item.id, newQty)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Total + Checkout */}
          <div className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-3xl font-bold text-black">
                <span className="text-[#F3CFC6]">${total.toFixed(2)}</span>
              </p>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <Link href="/dashboard/merchandise">Continue Shopping</Link>
              </Button>
              <Button
                asChild
                className="flex-1 sm:flex-none bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800"
              >
                <Link href="/dashboard/merchandise/checkout">
                  Proceed to Checkout
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Skeleton loader
function CartPageSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full bg-white/50" />
              <div>
                <Skeleton className="h-8 w-32 bg-white/50" />
                <Skeleton className="h-4 w-40 mt-2 bg-white/50" />
              </div>
            </div>
            <Skeleton className="h-9 w-28 rounded-full bg-white/50" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg bg-white/50" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 border rounded-lg"
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
    </div>
  );
}
