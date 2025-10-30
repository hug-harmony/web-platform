"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";

interface Merch {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
}
interface Order {
  id: string;
  user: { name: string; email: string };
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function MerchandisePage() {
  const [activeTab, setActiveTab] = useState("items");
  const [merch, setMerch] = useState<Merch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    const path =
      activeTab === "items"
        ? "/api/merchandise?admin=true"
        : "/api/merchandise/orders";
    const res = await fetch(path);
    const data = await res.json();
    activeTab === "items" ? setMerch(data) : setOrders(data);
    setLoading(false);
  };

  const filteredMerch = merch.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const updateOrderStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/merchandise/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      toast.success("Order updated");
      fetchData();
    }
  };

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center text-2xl font-bold">
            <Package className="mr-2 h-6 w-6" />
            Merchandise
          </CardTitle>
          {activeTab === "items" && (
            <Button asChild>
              <Link href="/admin/dashboard/merchandise/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Link>
            </Button>
          )}
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20">
          <TabsTrigger
            value="items"
            className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
          >
            Items
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
          >
            Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-[#C4C4C4]"
            />
          </div>
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <p className="text-center">Loading...</p>
              ) : filteredMerch.length === 0 ? (
                <p className="text-center text-[#C4C4C4]">No items</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredMerch.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-4 border rounded hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                          {m.image ? (
                            <Image
                              src={m.image}
                              alt={m.name}
                              width={64}
                              height={64}
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gray-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{m.name}</p>
                          <p className="text-sm text-[#C4C4C4]">
                            ${m.price} • Stock: {m.stock}
                          </p>
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/dashboard/merchandise/${m.id}`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <p className="text-center">Loading...</p>
              ) : orders.length === 0 ? (
                <p className="text-center text-[#C4C4C4]">No orders</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between p-4 border rounded hover:bg-[#F3CFC6]/10"
                    >
                      <div className="flex items-center gap-4">
                        <ShoppingBag className="h-8 w-8 text-[#F3CFC6]" />
                        <div>
                          <p className="font-semibold">{o.user.name}</p>
                          <p className="text-sm text-[#C4C4C4]">
                            {o.user.email} • ${o.totalAmount}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            o.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : o.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {o.status}
                        </span>
                        {o.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(o.id, "shipped")}
                            >
                              Ship
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateOrderStatus(o.id, "completed")
                              }
                            >
                              Complete
                            </Button>
                          </>
                        )}
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/admin/dashboard/merchandise/orders/${o.id}`}
                          >
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
