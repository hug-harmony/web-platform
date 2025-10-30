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
import Image from "next/image";

interface Merch {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
}

export default function MerchStore() {
  const [items, setItems] = useState<Merch[]>([]);
  const [search, setSearch] = useState("");
  const { addToCart, cart } = useCart();

  useEffect(() => {
    fetch("/api/merchandise")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-2xl font-bold">
              <Package className="mr-2 h-6 w-6" />
              Merch Store
            </CardTitle>
          </div>
          <Button asChild>
            <Link href="/dashboard/merchandise/cart">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart ({cart.length})
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
        <Input
          placeholder="Search merch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 border-[#C4C4C4]"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {filtered.map((m) => (
            <motion.div
              key={m.id}
              layout
              whileHover={{ scale: 1.05 }}
              className="group"
            >
              <Card className="overflow-hidden hover:shadow-xl transition-shadow">
                <Link href={`/dashboard/merchandise/${m.id}`}>
                  <div className="aspect-square bg-gray-200">
                    <Image
                      src={m.image || ""}
                      alt={m.name}
                      className="h-full w-full object-cover"
                      width={500}
                      height={500}
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-black dark:text-white">
                      {m.name}
                    </h3>
                    <p className="text-lg font-bold text-[#F3CFC6]">
                      ${m.price}
                    </p>
                    <p className="text-sm text-[#C4C4C4]">Stock: {m.stock}</p>
                  </CardContent>
                </Link>
                <div className="p-4 pt-0">
                  <Button
                    className="w-full"
                    onClick={() => {
                      addToCart(m);
                      toast.success("Added to cart");
                    }}
                    disabled={m.stock === 0}
                  >
                    {m.stock === 0 ? "Out of Stock" : "Add to Cart"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
