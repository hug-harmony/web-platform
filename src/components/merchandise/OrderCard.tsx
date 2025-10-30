"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Package, CheckCircle, Clock, XCircle } from "lucide-react";

interface OrderItem {
  id: string;
  quantity: number;
  merchandise: {
    name: string;
    price: number;
  };
}

interface Order {
  id: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  processing: {
    label: "Processing",
    color: "bg-blue-100 text-blue-800",
    icon: Package,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

export default function OrderCard({ order }: { order: Order }) {
  const { label, color, icon: StatusIcon } = statusConfig[order.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-black dark:text-white">
                Order #{order.id.slice(-6).toUpperCase()}
              </p>
              <p className="text-sm text-[#C4C4C4]">
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <span
              className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${color}`}
            >
              <StatusIcon className="h-3 w-3" />
              {label}
            </span>
          </div>

          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {order.items.map((item) => (
              <p key={item.id}>
                {item.merchandise.name} × {item.quantity}
              </p>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <p className="font-bold text-black dark:text-white">Total</p>
            <p className="text-xl font-bold text-[#F3CFC6]">
              ${order.totalAmount.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
