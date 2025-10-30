"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeft, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import Image from "next/image";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity } = useCart();
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto text-center">
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
          <CardHeader>
            <CardTitle>Your Cart is Empty</CardTitle>
          </CardHeader>
        </Card>
        <Button asChild>
          <Link href="/dashboard/merchandise">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/merchandise">
              <ArrowLeft />
            </Link>
          </Button>
          <CardTitle className="flex items-center text-2xl font-bold">
            <ShoppingCart className="mr-2 h-6 w-6" />
            Your Cart
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 border rounded"
            >
              <div className="h-16 w-16 bg-gray-200 rounded">
                <Image
                  src={item.image || ""}
                  alt=""
                  className="h-full w-full object-cover rounded"
                  width={500}
                  height={500}
                />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-[#C4C4C4]">
                  ${item.price} × {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity === 1}
                >
                  -
                </Button>
                <span>{item.quantity}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  disabled={item.quantity >= item.stock}
                >
                  +
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    removeFromCart(item.id);
                    toast.success("Removed");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="border-t pt-4 flex justify-between items-center">
            <p className="text-xl font-bold">Total: ${total.toFixed(2)}</p>
            <Button asChild size="lg">
              <Link href="/dashboard/merchandise/checkout">Checkout</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
