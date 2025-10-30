/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function UserOrdersPage() {
  const { id } = useParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${id}/orders`)
      .then((r) => r.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="text-center">Loading...</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/dashboard/profile/${id}`}>
              <ArrowLeft />
            </Link>
          </Button>
          <CardTitle className="flex items-center text-2xl font-bold">
            <Package className="mr-2 h-6 w-6" />
            My Orders
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-[#C4C4C4]">
              No orders yet.
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6 space-y-2">
                <div className="flex justify-between">
                  <p className="font-semibold">Order #{order.id.slice(-6)}</p>
                  <span
                    className={`px-2 py-1 text-xs rounded ${order.status === "completed" ? "bg-green-100 text-green-800" : order.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-[#C4C4C4]">
                  ${order.totalAmount} •{" "}
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
                <div className="text-sm">
                  {order.items.map((i: any) => (
                    <p key={i.id}>
                      {i.merchandise.name} × {i.quantity}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
