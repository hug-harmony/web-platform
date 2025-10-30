"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const router = useRouter();
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    const res = await fetch("/api/merchandise/checkout", {
      method: "POST",
      body: JSON.stringify({ items: cart }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      clearCart();
      toast.success("Order placed!");
      router.push("/dashboard/merchandise");
    } else toast.error("Failed");
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/merchandise/cart">
              <ArrowLeft />
            </Link>
          </Button>
          <CardTitle className="flex items-center text-2xl font-bold">
            <CreditCard className="mr-2 h-6 w-6" />
            Checkout
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <h3 className="font-semibold mb-2">Order Summary</h3>
            {cart.map((i) => (
              <p key={i.id}>
                {i.name} × {i.quantity} = ${(i.price * i.quantity).toFixed(2)}
              </p>
            ))}
            <p className="font-bold border-t pt-2">
              Total: ${total.toFixed(2)}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Shipping Address</Label>
              <Input placeholder="123 Main St" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" />
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
          >
            {loading ? "Processing..." : "Pay Now"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
