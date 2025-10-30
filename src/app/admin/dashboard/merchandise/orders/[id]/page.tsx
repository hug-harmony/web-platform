"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Order {
  id: string;
  user: { name: string; email: string };
  totalAmount: number;
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    merchandise: { name: string };
    quantity: number;
    price: number;
  }>;
}

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/merchandise/orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setOrder)
      .catch(() => toast.error("Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-center">Loading...</p>;
  if (!order)
    return <p className="text-center text-red-500">Order not found</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/dashboard/merchandise">
              <ArrowLeft />
            </Link>
          </Button>
          <CardTitle className="text-2xl font-bold">
            Order #{order.id.slice(-6)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Customer</p>
              <p>{order.user.name}</p>
              <p className="text-sm text-[#C4C4C4]">{order.user.email}</p>
            </div>
            <div>
              <p className="font-semibold">Order Date</p>
              <p>{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div>
            <p className="font-semibold">Total Amount</p>
            <p className="text-xl font-bold">${order.totalAmount.toFixed(2)}</p>
          </div>

          <div>
            <p className="font-semibold mb-2">Status</p>
            <span
              className={`px-3 py-1 text-sm rounded-full ${
                order.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : order.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-blue-100 text-blue-800"
              }`}
            >
              {order.status}
            </span>
          </div>

          <div>
            <p className="font-semibold mb-2">Items</p>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 border rounded bg-gray-50 dark:bg-gray-800"
                >
                  <span>{item.merchandise.name}</span>
                  <span>
                    x{item.quantity} @ ${item.price.toFixed(2)} = $
                    {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
