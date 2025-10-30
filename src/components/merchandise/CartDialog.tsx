// components/CartDialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import Image from "next/image";

interface CartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartDialog({ open, onOpenChange }: CartDialogProps) {
  const { cart, getTotal } = useCart();
  const total = getTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Added to Cart!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              <div className="relative h-12 w-12 bg-gray-100 rounded overflow-hidden">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-6 w-6 text-[#C4C4C4]" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-[#C4C4C4]">
                  ${item.price.toFixed(2)} × {item.quantity}
                </p>
              </div>
              <p className="font-medium text-sm text-[#F3CFC6]">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t pt-3">
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold">Total</p>
            <p className="text-xl font-bold text-[#F3CFC6]">
              ${total.toFixed(2)}
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Continue Shopping
            </Button>
            <Button
              asChild
              className="bg-[#F3CFC6] hover:bg-[#F3CFC6]/90 text-black"
            >
              <Link href="/dashboard/merchandise/checkout">Go to Checkout</Link>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
