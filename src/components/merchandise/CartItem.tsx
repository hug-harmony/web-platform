"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Trash2, Minus, Plus, Package } from "lucide-react";

interface CartItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    image?: string;
    quantity: number;
    stock: number;
  };
  onRemove: () => void;
  onUpdate: (qty: number) => void;
}

export default function CartItem({ item, onRemove, onUpdate }: CartItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative h-16 w-16 bg-gray-100 rounded overflow-hidden">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-8 w-8 text-[#C4C4C4]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1">
        <p className="font-semibold text-black dark:text-white">{item.name}</p>
        <p className="text-sm text-[#C4C4C4]">
          ${item.price.toFixed(2)} × {item.quantity}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={() => onUpdate(item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <span className="w-8 text-center font-medium">{item.quantity}</span>

        <Button
          size="icon"
          variant="outline"
          onClick={() => onUpdate(item.quantity + 1)}
          disabled={item.quantity >= item.stock}
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
