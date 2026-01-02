"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Search,
  ShoppingCart,
  RefreshCw,
  Keyboard,
  X,
  Filter,
  DollarSign,
  Tag,
  Box,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import ProductCard from "@/components/merchandise/ProductCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Merch {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  category?: string;
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

// Category color mapping
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Clothing: { bg: "bg-blue-100", text: "text-blue-700" },
  Accessories: { bg: "bg-purple-100", text: "text-purple-700" },
  Collectibles: { bg: "bg-pink-100", text: "text-pink-700" },
  Digital: { bg: "bg-green-100", text: "text-green-700" },
  default: { bg: "bg-gray-100", text: "text-gray-700" },
};

// Sort options
type SortOption = "featured" | "priceLow" | "priceHigh" | "newest";

export default function MerchStore() {
  const [items, setItems] = useState<Merch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");

  const { addToCart, cart } = useCart();
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

  // Fetch data
  const fetchData = useCallback(async (showRefreshToast = false) => {
    if (showRefreshToast) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/merchandise", {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to load merchandise");

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);

      if (showRefreshToast) {
        toast.success("Store refreshed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load merchandise");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchData();
    }
  }, [fetchData]);

  // Get unique categories
  const categories = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.category).filter(Boolean))),
    [items]
  );

  // Filter and sort items - all client-side
  const filteredItems = useMemo(() => {
    let result = items.filter((item) => {
      const matchesSearch = searchQuery
        ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesCategory = categoryFilter
        ? item.category === categoryFilter
        : true;
      return matchesSearch && matchesCategory;
    });

    // Sort
    switch (sortBy) {
      case "priceLow":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "priceHigh":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "newest":
        result = [...result].reverse();
        break;
      default:
        break;
    }

    return result;
  }, [items, searchQuery, categoryFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const totalValue = items.reduce((sum, item) => sum + item.price, 0);
    const inStock = items.filter((item) => item.stock > 0).length;
    const avgPrice = items.length > 0 ? totalValue / items.length : 0;

    return {
      totalItems: items.length,
      inStock,
      categories: categories.length,
      avgPrice,
    };
  }, [items, categories]);

  // Get category colors
  const getCategoryColors = (category?: string) => {
    if (!category) return CATEGORY_COLORS.default;
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
  };

  // Handle add to cart
  const handleAddToCart = (item: Merch) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      stock: item.stock,
    });
    toast.success(`${item.name} added to cart!`);
  };

  // Handle search button click
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"...`);
    }
  }, [searchQuery]);

  // Loading state
  if (loading) {
    return <MerchStoreSkeleton />;
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
                  Merch Store
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  Exclusive gear for the community
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchData(true)}
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
                  <Link href="/dashboard/merchandise/cart">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Cart
                    {cart.length > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      >
                        {cart.length}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalItems}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Box className="h-3 w-3" />
                Products
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.inStock}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Package className="h-3 w-3" />
                In Stock
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.categories}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Tag className="h-3 w-3" />
                Categories
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
                placeholder="Search products... (press / to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 py-3 rounded-lg border bg-white shadow-sm focus:ring-2 focus:ring-[#F3CFC6]/50"
                data-search-input
                aria-label="Search products"
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

            {/* Category Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-white shadow-sm"
                >
                  <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                  {categoryFilter || "All Categories"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setCategoryFilter("")}>
                  All Categories
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {categories.map((category) => {
                  const colors = getCategoryColors(category);
                  return (
                    <DropdownMenuItem
                      key={category}
                      onSelect={() => setCategoryFilter(category!)}
                    >
                      <Badge className={`${colors.bg} ${colors.text} mr-2`}>
                        {category}
                      </Badge>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-white shadow-sm"
                >
                  <TrendingUp className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSortBy("featured")}>
                  Featured
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortBy("priceLow")}>
                  Price: Low to High
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortBy("priceHigh")}>
                  Price: High to Low
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortBy("newest")}>
                  Newest
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black">
            <Package className="mr-2 h-5 w-5 text-[#F3CFC6]" />
            Available Items
            {filteredItems.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredItems.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="popLayout">
            {filteredItems.length > 0 ? (
              <motion.div
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                variants={containerVariants}
              >
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={itemVariants}
                    layout
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <ProductCard
                      item={item}
                      onAddToCart={() => handleAddToCart(item)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Package className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchQuery || categoryFilter
                    ? "Try adjusting your filters"
                    : "Check back soon for new items!"}
                </p>
                {(searchQuery || categoryFilter) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("");
                    }}
                    className="mt-4"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Skeleton loader
function MerchStoreSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-40 bg-white/50" />
              <Skeleton className="h-4 w-56 mt-2 bg-white/50" />
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
            <Skeleton className="h-12 w-36 bg-white/50" />
            <Skeleton className="h-12 w-24 bg-white/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
