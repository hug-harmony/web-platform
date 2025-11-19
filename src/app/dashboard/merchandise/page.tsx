"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import ProductCard from "@/components/merchandise/ProductCard";

interface Merch {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
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

export default function MerchStore() {
  const [items, setItems] = useState<Merch[]>([]);
  const [search, setSearch] = useState("");
  const { addToCart, cart } = useCart();

  useEffect(() => {
    fetch("/api/merchandise")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => toast.error("Failed to load merchandise"));
  }, []);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Gradient Header - Same as Notifications */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Merch Store
            </CardTitle>
            <p className="text-sm opacity-80">
              Exclusive gear for the community
            </p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center mb-6 w-full space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-white" />
              <Input
                type="text"
                placeholder="Search merch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="p-2 pl-10 rounded border-[#F3CFC6] text-black dark:text-white focus:ring-[#F3CFC6]"
              />
            </div>
            <Button
              asChild
              className="bg-white/20 backdrop-blur-sm text-black dark:text-white border border-white/30 hover:bg-white/30 w-full sm:w-auto"
            >
              <Link href="/dashboard/merchandise/cart">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Cart ({cart.length})
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black dark:text-white">
            <Package className="mr-2 h-6 w-6 text-[#F3CFC6]" />
            Available Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    onAddToCart={() => {
                      addToCart({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        image: item.image,
                        stock: item.stock,
                      });
                      toast.success("Added to cart!");
                    }}
                  />
                ))
              ) : (
                <p className="col-span-full text-center text-[#C4C4C4] py-8">
                  {search
                    ? "No items match your search."
                    : "No merchandise available."}
                </p>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
