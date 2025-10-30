"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, ShoppingCart, Zap } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import CartDialog from "@/components/merchandise/CartDialog";

interface Merch {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  description?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { addToCart, clearCart, getTotal } = useCart();

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/merchandise/${id}`);
        if (!res.ok) throw new Error("Failed to load product");
        const data = await res.json();
        setItem(data);
        setError(null);
      } catch (err) {
        setError("Product not found");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchItem();
  }, [id]);

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

    // Clear cart and add only this item
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

  // === LOADING, ERROR (unchanged) ===
  if (loading) {
    return (
      <motion.div
        className="space-y-6 w-full max-w-7xl mx-auto"
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
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="aspect-square rounded-xl bg-gray-200" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  if (error || !item) {
    return (
      <motion.div
        className="space-y-6 w-full max-w-7xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Product Not Found
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="text-center py-12">
          <p className="text-[#C4C4C4] mb-6">{error}</p>
          <Button asChild>
            <Link href="/dashboard/merchandise">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Store
            </Link>
          </Button>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        className="space-y-6 w-full max-w-7xl mx-auto"
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
                  <Link href="/dashboard/merchandise">
                    <ArrowLeft className="h-6 w-6" />
                  </Link>
                </Button>
                <div>
                  <CardTitle className="text-2xl font-bold text-black dark:text-white flex items-center">
                    <Package className="mr-2 h-6 w-6" />
                    {item.name}
                  </CardTitle>
                  <p className="text-sm opacity-80">Product Details</p>
                </div>
              </div>
            </motion.div>
          </CardHeader>
        </Card>

        {/* Product Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <motion.div
            variants={itemVariants}
            className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-lg group"
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
                <Package className="h-24 w-24 text-[#C4C4C4]" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>

          {/* Details Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full shadow-lg">
              <CardContent className="p-6 space-y-5 flex flex-col h-full">
                <div>
                  <h1 className="text-3xl font-bold text-black dark:text-white">
                    {item.name}
                  </h1>
                  <p className="text-3xl font-bold text-[#F3CFC6] mt-2">
                    ${item.price.toFixed(2)}
                  </p>
                  <p className="text-sm text-[#C4C4C4] mt-1">
                    {item.stock > 0 ? (
                      <span className="text-green-600 dark:text-green-400">
                        In Stock: {item.stock}
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        Out of Stock
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex-1">
                  <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
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
                    className="w-full text-lg font-medium bg-[#F3CFC6] hover:bg-[#F3CFC6]/90 text-black"
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
