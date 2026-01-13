"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package,
  PackageOpen,
  Search,
  RefreshCw,
  Keyboard,
  X,
  Filter,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import OrderCard from "@/components/merchandise/OrderCard";

interface OrderItem {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
}

interface Order {
  id: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Status color mapping
const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; icon: React.ElementType }
> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
  processing: { bg: "bg-blue-100", text: "text-blue-700", icon: Truck },
  completed: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
  cancelled: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: session, status } = useSession();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initialFetchDone = useRef(false);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (
        e.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(
    async (showRefreshToast = false) => {
      if (status !== "authenticated" || !session?.user?.id) return;

      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await fetch(`/api/users/${session.user.id}/orders`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to load orders");

        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
        setError(null);

        if (showRefreshToast) {
          toast.success("Orders refreshed");
        }
      } catch (err) {
        console.error(err);
        setError("Could not load orders. Please try again.");
        if (showRefreshToast) {
          toast.error("Failed to refresh orders");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, session?.user?.id]
  );

  // Initial fetch
  useEffect(() => {
    if (status === "authenticated" && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchOrders();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, fetchOrders, router]);

  // Filter orders - client-side
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          order.id.toLowerCase().includes(query) ||
          order.items.some((item) =>
            item.merchandise.name.toLowerCase().includes(query)
          )
        );
      })
      .filter((order) => (statusFilter ? order.status === statusFilter : true));
  }, [orders, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalSpent = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const pending = orders.filter((o) => o.status === "pending").length;
    const completed = orders.filter((o) => o.status === "completed").length;

    return {
      totalOrders: orders.length,
      totalSpent,
      pending,
      completed,
    };
  }, [orders]);

  // Handle search button click
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"...`);
    }
  }, [searchQuery]);

  // Get status label
  const getStatusLabel = (statusKey: string) => {
    return statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
  };

  // Loading state
  if (status === "loading" || loading) {
    return <OrdersPageSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  // Error state
  if (error) {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                <Package className="h-6 w-6" />
                My Orders
              </CardTitle>
              <p className="text-sm text-black/70 mt-1">
                Track and manage your orders
              </p>
            </div>
          </CardHeader>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 mb-4 opacity-30 text-red-400" />
            <p className="text-red-500 mb-6">{error}</p>
            <Button onClick={() => fetchOrders()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader className="pb-2">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                  <Package className="h-6 w-6" />
                  My Orders
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  Track and manage your orders
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchOrders(true)}
                  disabled={refreshing}
                  className="rounded-full bg-white/80 hover:bg-white"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-white/90 hover:bg-white text-gray-800"
                >
                  <Link href="/dashboard/merchandise">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Shop
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalOrders}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Package className="h-3 w-3" />
                Total Orders
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-[#F3CFC6]">
                ${stats.totalSpent.toFixed(2)}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" />
                Total Spent
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.completed}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Completed
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-grow w-full">
              <Search
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search orders by ID or product... (press / to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 py-3 rounded-lg border bg-white shadow-sm focus:ring-2 focus:ring-[#F3CFC6]/50"
                data-search-input
                aria-label="Search orders"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm hover:bg-muted"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <div className="hidden sm:flex items-center text-xs text-muted-foreground">
                    <Keyboard className="h-3 w-3 mr-1" aria-hidden="true" />
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                      /
                    </kbd>
                  </div>
                )}
              </div>
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              className="w-full sm:w-auto bg-white hover:bg-white/80 text-gray-800 shadow-sm"
            >
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              Search
            </Button>

            {/* Status Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-white shadow-sm"
                >
                  <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                  {statusFilter ? getStatusLabel(statusFilter) : "All Status"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setStatusFilter("")}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {["pending", "processing", "completed", "cancelled"].map(
                  (statusKey) => {
                    const colors = STATUS_COLORS[statusKey];
                    return (
                      <DropdownMenuItem
                        key={statusKey}
                        onSelect={() => setStatusFilter(statusKey)}
                      >
                        <Badge className={`${colors.bg} ${colors.text} mr-2`}>
                          {getStatusLabel(statusKey)}
                        </Badge>
                      </DropdownMenuItem>
                    );
                  }
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black">
            <Package className="mr-2 h-5 w-5 text-[#F3CFC6]" />
            Order History
            {filteredOrders.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredOrders.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <AnimatePresence mode="popLayout">
              {filteredOrders.length > 0 ? (
                <motion.div className="space-y-4" variants={containerVariants}>
                  {filteredOrders.map((order) => {
                    const statusColors = STATUS_COLORS[order.status];
                    const StatusIcon = statusColors.icon;

                    return (
                      <motion.div
                        key={order.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20 }}
                        layout
                        whileHover={{
                          scale: 1.01,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                        className="border rounded-lg bg-white hover:border-[#F3CFC6] transition-colors overflow-hidden"
                      >
                        {/* Order Header */}
                        <div className="p-4 border-b bg-gray-50/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center">
                                <Package className="h-5 w-5 text-[#F3CFC6]" />
                              </div>
                              <div>
                                <p className="font-semibold text-black">
                                  Order #{order.id.slice(-8).toUpperCase()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(order.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge
                                className={`${statusColors.bg} ${statusColors.text} flex items-center gap-1`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {getStatusLabel(order.status)}
                              </Badge>
                              <p className="text-lg font-bold text-[#F3CFC6]">
                                ${order.totalAmount.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="p-4">
                          <div className="space-y-3">
                            {order.items.slice(0, 3).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3"
                              >
                                <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                                  {item.merchandise.image ? (
                                    <Image
                                      src={item.merchandise.image}
                                      alt={item.merchandise.name}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <Package className="h-6 w-6 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-black truncate">
                                    {item.merchandise.name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Qty: {item.quantity} × $
                                    {item.merchandise.price.toFixed(2)}
                                  </p>
                                </div>
                                <p className="font-medium text-gray-700">
                                  $
                                  {(
                                    item.quantity * item.merchandise.price
                                  ).toFixed(2)}
                                </p>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <p className="text-sm text-gray-500 text-center">
                                +{order.items.length - 3} more item
                                {order.items.length - 3 > 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <PackageOpen className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">No orders found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchQuery || statusFilter
                      ? "Try adjusting your filters"
                      : "Start shopping to see your orders here!"}
                  </p>
                  {searchQuery || statusFilter ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("");
                      }}
                      className="mt-4"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="mt-4 bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800"
                    >
                      <Link href="/dashboard/merchandise">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Start Shopping
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Skeleton loader
function OrdersPageSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-32 bg-white/50" />
              <Skeleton className="h-4 w-48 mt-2 bg-white/50" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-full bg-white/50" />
              <Skeleton className="h-9 w-20 rounded-full bg-white/50" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg bg-white/50" />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton className="h-12 flex-1 bg-white/50" />
            <Skeleton className="h-12 w-24 bg-white/50" />
            <Skeleton className="h-12 w-32 bg-white/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-24 mt-1" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20 mt-1" />
                      </div>
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
