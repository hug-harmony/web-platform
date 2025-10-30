"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";

interface Merch {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
}

interface ProductCardProps {
  item: Merch;
  onAddToCart: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function ProductCard({ item, onAddToCart }: ProductCardProps) {
  return (
    <motion.div
      layout
      variants={cardVariants}
      whileHover={{
        scale: 1.005,
        boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
      }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <Card className="overflow-hidden transition-all duration-300 h-full flex flex-col">
        <Link href={`/dashboard/merchandise/${item.id}`} className="flex-grow">
          <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
            {item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="h-16 w-16 text-[#C4C4C4]" />
              </div>
            )}
          </div>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-black dark:text-white line-clamp-2">
              {item.name}
            </h3>
            <p className="text-lg font-bold text-[#F3CFC6]">${item.price}</p>
            <p className="text-sm text-[#C4C4C4]">
              {item.stock > 0 ? `Stock: ${item.stock}` : "Out of Stock"}
            </p>
          </CardContent>
        </Link>

        <div className="p-4 pt-0">
          <Button
            onClick={onAddToCart}
            disabled={item.stock === 0}
            className="w-full bg-[#F3CFC6] hover:bg-[#F3CFC6]/90 text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {item.stock === 0 ? "Out of Stock" : "Add to Cart"}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
