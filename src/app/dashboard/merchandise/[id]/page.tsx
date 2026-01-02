"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Package,
  ShoppingCart,
  Zap,
  RefreshCw,
  Tag,
  Box,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import CartDialog from "@/components/merchandise/CartDialog";

interface Merch {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  description?: string;
  category?: string;
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

export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [item, setItem] = useState<Merch | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { addToCart, clearCart, cart } = useCart();

  // Fetch item
  const fetchItem = useCallback(
    async (showRefreshToast = false) => {
      if (!id) return;

      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await fetch(`/api/merchandise/${id}`);
        if (!res.ok) throw new Error("Failed to load product");
        const data = await res.json();
        setItem(data);
        setError(null);

        if (showRefreshToast) {
          toast.success("Product refreshed");
        }
      } catch (err) {
        setError("Product not found");
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  // Stats for this product
  const stats = useMemo(() => {
    if (!item) return null;
    return {
      price: item.price,
      stock: item.stock,
      inCart: cart.filter((c) => c.id === item.id).length,
      available: item.stock > 0,
    };
  }, [item, cart]);

  const handleAddToCart = () => {
    if (!item || item.stock === 0) return;

    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      stock: item.stock,
    });

    toast.success("Added to cart!");
    setDialogOpen(true);
  };

  const handleBuyNow = () => {
    if (!item || item.stock === 0) return;

    clearCart();
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      stock: item.stock,
    });

    toast.success("Redirecting to checkout...");
    router.push("/dashboard/merchandise/checkout");
  };

  // Loading state
  if (loading) {
    return <ProductPageSkeleton />;
  }

  // Error state
  if (error || !item) {
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
                <CardTitle className="text-2xl font-bold text-black">
                  Product Not Found
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  The product you&apos;re looking for doesn&apos;t exist
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 mb-4 opacity-30 text-gray-400" />
            <p className="text-gray-500 mb-6">{error}</p>
            <Button asChild>
              <Link href="/dashboard/merchandise">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Store
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
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
                      <Package className="h-6 w-6" />
                      {item.name}
                    </CardTitle>
                    <p className="text-sm text-black/70 mt-1">
                      Product Details
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchItem(true)}
                    disabled={refreshing}
                    className="rounded-full bg-white/80 hover:bg-white"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-full bg-white/90 hover:bg-white text-gray-800"
                  >
                    <Link href="/dashboard/merchandise/cart">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Cart ({cart.length})
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-[#F3CFC6]">
                    ${stats.price.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Price
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p
                    className={`text-2xl font-bold ${stats.stock > 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    {stats.stock}
                  </p>
                  <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    <Box className="h-3 w-3" />
                    In Stock
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.inCart}
                  </p>
                  <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    In Cart
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.available ? (
                      <CheckCircle className="h-6 w-6 mx-auto" />
                    ) : (
                      "—"
                    )}
                  </p>
                  <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    <Tag className="h-3 w-3" />
                    {stats.available ? "Available" : "Sold Out"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <motion.div
            variants={itemVariants}
            className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-lg group"
          >
            {item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="h-24 w-24 text-gray-300" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>

          {/* Details Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full shadow-lg">
              <CardContent className="p-6 space-y-5 flex flex-col h-full">
                <div>
                  <div className="flex items-start justify-between">
                    <h1 className="text-3xl font-bold text-black">
                      {item.name}
                    </h1>
                    {item.category && (
                      <Badge className="bg-[#F3CFC6]/20 text-gray-700">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-[#F3CFC6] mt-2">
                    ${item.price.toFixed(2)}
                  </p>
                  <p className="text-sm mt-2">
                    {item.stock > 0 ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        In Stock: {item.stock} available
                      </span>
                    ) : (
                      <span className="text-red-500">Out of Stock</span>
                    )}
                  </p>
                </div>

                <div className="flex-1">
                  <p className="text-base text-gray-600 leading-relaxed">
                    {item.description || "No description available."}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full text-lg font-medium border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/10"
                    onClick={handleAddToCart}
                    disabled={item.stock === 0}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </Button>

                  <Button
                    size="lg"
                    className="w-full text-lg font-medium bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800"
                    onClick={handleBuyNow}
                    disabled={item.stock === 0}
                  >
                    <Zap className="mr-2 h-5 w-5" />
                    Buy Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Cart Dialog */}
      <CartDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

// Skeleton loader
function ProductPageSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full bg-white/50" />
              <div>
                <Skeleton className="h-8 w-48 bg-white/50" />
                <Skeleton className="h-4 w-32 mt-2 bg-white/50" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-full bg-white/50" />
              <Skeleton className="h-9 w-20 rounded-full bg-white/50" />
            </div>
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

      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="aspect-square rounded-xl" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
