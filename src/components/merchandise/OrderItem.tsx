"use client";

import { motion } from "framer-motion";
import { Package } from "lucide-react";
import Image from "next/image";

interface OrderItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    image?: string;
    quantity: number;
  };
}

export default function OrderItem({ item }: OrderItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3 text-sm"
    >
      {item.image ? (
        <div className="relative h-10 w-10 rounded overflow-hidden bg-gray-100">
          <Image src={item.image} alt="" fill className="object-cover" />
        </div>
      ) : (
        <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
          <Package className="h-5 w-5 text-[#C4C4C4]" />
        </div>
      )}

      <div className="flex-1">
        <p className="font-medium text-black dark:text-white">{item.name}</p>
        <p className="text-[#C4C4C4]">
          ${item.price.toFixed(2)} × {item.quantity}
        </p>
      </div>

      <p className="font-medium text-[#F3CFC6]">
        ${(item.price * item.quantity).toFixed(2)}
      </p>
    </motion.div>
  );
}
