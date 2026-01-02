"use client";

import {
  Suspense,
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit,
  Trash,
  DollarSign,
  Percent,
  RefreshCw,
  Search,
  Keyboard,
  X,
  Filter,
  Tag,
  TrendingDown,
  Calendar,
  Save,
  Loader2,
  AlertCircle,
  TicketPercent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { redirect, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface Discount {
  id: string;
  name: string;
  rate: number;
  discount: number;
  createdAt: string;
  updatedAt: string;
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Sort options
type SortOption = "newest" | "oldest" | "highestDiscount" | "lowestDiscount";

function DiscountsContent() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const professionalId = searchParams.get("professionalId");

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rate: "",
    discount: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch discounts
  const fetchDiscounts = useCallback(
    async (showRefreshToast = false) => {
      if (!professionalId) return;

      if (showRefreshToast) {
        setRefreshing(true);
      }

      try {
        const res = await fetch(
          `/api/discounts/professional/${professionalId}`,
          { credentials: "include" }
        );

        if (!res.ok) throw new Error("Failed to fetch discounts");

        const data = await res.json();
        setDiscounts(Array.isArray(data) ? data : []);

        if (showRefreshToast) {
          toast.success("Discounts refreshed");
        }
      } catch (error) {
        console.error("Error fetching discounts:", error);
        toast.error("Failed to load discounts");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [professionalId]
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }

    const fetchProfessionalData = async () => {
      if (!professionalId) {
        toast.error("You are not an approved professional.");
        redirect("/dashboard");
      }

      try {
        const res = await fetch("/api/users/me", { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) redirect("/login");
          throw new Error("Failed to fetch user data");
        }

        const userData = await res.json();
        const application = userData.professionalApplication;

        if (
          application?.status !== "APPROVED" ||
          application?.professionalId !== professionalId
        ) {
          toast.error("You are not an approved professional.");
          redirect("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching professional data:", error);
        toast.error("Failed to verify professional status");
        redirect("/dashboard");
      }
    };

    fetchProfessionalData();
    fetchDiscounts();
  }, [professionalId, status, fetchDiscounts]);

  // Filter and sort discounts
  const filteredDiscounts = useMemo(() => {
    let result = discounts.filter((discount) => {
      if (!searchQuery) return true;
      return discount.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Sort
    switch (sortBy) {
      case "oldest":
        result = [...result].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "highestDiscount":
        result = [...result].sort((a, b) => b.discount - a.discount);
        break;
      case "lowestDiscount":
        result = [...result].sort((a, b) => a.discount - b.discount);
        break;
      case "newest":
      default:
        result = [...result].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return result;
  }, [discounts, searchQuery, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const totalDiscounts = discounts.length;
    const avgDiscount =
      discounts.length > 0
        ? discounts.reduce((sum, d) => sum + d.discount, 0) / discounts.length
        : 0;
    const maxDiscount =
      discounts.length > 0 ? Math.max(...discounts.map((d) => d.discount)) : 0;
    const totalSavings = discounts.reduce(
      (sum, d) => sum + (d.rate * d.discount) / 100,
      0
    );

    return {
      totalDiscounts,
      avgDiscount,
      maxDiscount,
      totalSavings,
    };
  }, [discounts]);

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    const rate = parseFloat(formData.rate);
    if (isNaN(rate) || rate <= 0) {
      errors.rate = "Rate must be greater than 0";
    }

    const discount = parseFloat(formData.discount);
    if (isNaN(discount) || discount <= 0 || discount > 100) {
      errors.discount = "Discount must be between 1 and 100";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const body = {
        name: formData.name.trim(),
        rate: parseFloat(formData.rate),
        discount: parseFloat(formData.discount),
        professionalId,
      };

      const url = editingDiscount
        ? `/api/discounts/${editingDiscount.id}`
        : "/api/discounts";
      const method = editingDiscount ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save discount");
      }

      const newDiscount = await res.json();

      if (editingDiscount) {
        setDiscounts((prev) =>
          prev.map((d) => (d.id === newDiscount.id ? newDiscount : d))
        );
        toast.success("Discount updated successfully");
      } else {
        setDiscounts((prev) => [newDiscount, ...prev]);
        toast.success("Discount created successfully");
      }

      setIsDialogOpen(false);
      setFormData({ name: "", rate: "", discount: "" });
      setEditingDiscount(null);
    } catch (error) {
      console.error("Error saving discount:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save discount"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      rate: discount.rate.toString(),
      discount: discount.discount.toString(),
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/discounts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete discount");
      }

      setDiscounts((prev) => prev.filter((d) => d.id !== id));
      toast.success("Discount deleted");
    } catch (error) {
      console.error("Error deleting discount:", error);
      toast.error("Failed to delete discount");
    }
  };

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"...`);
    }
  }, [searchQuery]);

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case "newest":
        return "Newest First";
      case "oldest":
        return "Oldest First";
      case "highestDiscount":
        return "Highest Discount";
      case "lowestDiscount":
        return "Lowest Discount";
      default:
        return "Sort";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Loading state
  if (status === "loading" || loading) {
    return <DiscountsSkeleton />;
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
                  <TicketPercent className="h-6 w-6" />
                  Manage Discounts
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  Create and manage your discount offers
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDiscounts(true)}
                  disabled={refreshing}
                  className="rounded-full bg-white/80 hover:bg-white"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>

                {/* Add Discount Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="rounded-full bg-white/90 hover:bg-white text-gray-800"
                      onClick={() => {
                        setEditingDiscount(null);
                        setFormData({ name: "", rate: "", discount: "" });
                        setFormErrors({});
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Discount
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <TicketPercent className="h-5 w-5 text-[#F3CFC6]" />
                        {editingDiscount ? "Edit Discount" : "Create Discount"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      {/* Name Field */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="name"
                          className="flex items-center gap-2"
                        >
                          <Tag className="h-4 w-4 text-[#F3CFC6]" />
                          Discount Name
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="e.g., New Client Offer"
                          className="border-gray-200 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]/20"
                          disabled={saving}
                        />
                        {formErrors.name && (
                          <p className="text-red-500 text-xs flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {formErrors.name}
                          </p>
                        )}
                      </div>

                      {/* Rate Field */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="rate"
                          className="flex items-center gap-2"
                        >
                          <DollarSign className="h-4 w-4 text-[#F3CFC6]" />
                          Original Rate ($)
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            $
                          </span>
                          <Input
                            id="rate"
                            name="rate"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.rate}
                            onChange={handleInputChange}
                            placeholder="100.00"
                            className="pl-7 border-gray-200 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]/20"
                            disabled={saving}
                          />
                        </div>
                        {formErrors.rate && (
                          <p className="text-red-500 text-xs flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {formErrors.rate}
                          </p>
                        )}
                      </div>

                      {/* Discount Field */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="discount"
                          className="flex items-center gap-2"
                        >
                          <Percent className="h-4 w-4 text-[#F3CFC6]" />
                          Discount Percentage
                        </Label>
                        <div className="relative">
                          <Input
                            id="discount"
                            name="discount"
                            type="number"
                            step="1"
                            min="1"
                            max="100"
                            value={formData.discount}
                            onChange={handleInputChange}
                            placeholder="20"
                            className="pr-8 border-gray-200 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]/20"
                            disabled={saving}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                            %
                          </span>
                        </div>
                        {formErrors.discount && (
                          <p className="text-red-500 text-xs flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {formErrors.discount}
                          </p>
                        )}
                      </div>

                      {/* Preview */}
                      {formData.rate && formData.discount && (
                        <div className="p-3 bg-[#F3CFC6]/10 rounded-lg border border-[#F3CFC6]/30">
                          <p className="text-sm text-gray-600">
                            Final Price:{" "}
                            <span className="font-bold text-black">
                              $
                              {(
                                parseFloat(formData.rate) -
                                (parseFloat(formData.rate) *
                                  parseFloat(formData.discount)) /
                                  100
                              ).toFixed(2)}
                            </span>
                            <span className="ml-2 text-gray-400 line-through">
                              ${parseFloat(formData.rate).toFixed(2)}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Submit Button */}
                      <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="w-full bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800 rounded-full"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {editingDiscount
                              ? "Update Discount"
                              : "Create Discount"}
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </motion.div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalDiscounts}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Tag className="h-3 w-3" />
                Total Discounts
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.maxDiscount}%
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Max Discount
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.avgDiscount.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Percent className="h-3 w-3" />
                Avg Discount
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-[#F3CFC6]">
                ${stats.totalSavings.toFixed(0)}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" />
                Total Savings
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
                placeholder="Search discounts... (press / to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 py-3 rounded-lg border bg-white shadow-sm focus:ring-2 focus:ring-[#F3CFC6]/50"
                data-search-input
                aria-label="Search discounts"
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

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-white shadow-sm"
                >
                  <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                  {getSortLabel(sortBy)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(
                  [
                    "newest",
                    "oldest",
                    "highestDiscount",
                    "lowestDiscount",
                  ] as SortOption[]
                ).map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onSelect={() => setSortBy(option)}
                  >
                    {getSortLabel(option)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Discounts Grid */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black">
            <Tag className="mr-2 h-5 w-5 text-[#F3CFC6]" />
            Your Discounts
            {filteredDiscounts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredDiscounts.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="popLayout">
            {filteredDiscounts.length > 0 ? (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={containerVariants}
              >
                {filteredDiscounts.map((discount) => {
                  const finalPrice =
                    discount.rate - (discount.rate * discount.discount) / 100;

                  return (
                    <motion.div
                      key={discount.id}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      whileHover={{
                        scale: 1.02,
                        boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
                      }}
                    >
                      <Card className="border border-gray-200 hover:border-[#F3CFC6] transition-all overflow-hidden">
                        {/* Discount Badge */}
                        <div className="bg-gradient-to-r from-[#F3CFC6] to-[#e9bfb5] px-4 py-2 flex items-center justify-between">
                          <Badge className="bg-white/90 text-gray-800 hover:bg-white">
                            <Percent className="h-3 w-3 mr-1" />
                            {discount.discount}% OFF
                          </Badge>
                          <span className="text-xs text-black/70">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {formatDate(discount.createdAt)}
                          </span>
                        </div>

                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Name */}
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-black text-lg">
                                {discount.name}
                              </h3>
                            </div>

                            {/* Pricing */}
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-[#F3CFC6]">
                                ${finalPrice.toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-400 line-through">
                                ${discount.rate.toFixed(2)}
                              </span>
                            </div>

                            {/* Savings */}
                            <p className="text-sm text-green-600 flex items-center gap-1">
                              <TrendingDown className="h-4 w-4" />
                              Save $
                              {(
                                (discount.rate * discount.discount) /
                                100
                              ).toFixed(2)}
                            </p>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(discount)}
                                className="flex-1 rounded-full border-[#F3CFC6] text-gray-700 hover:bg-[#F3CFC6]/10"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(discount.id)}
                                className="rounded-full border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <TicketPercent className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">No discounts found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchQuery
                    ? "Try adjusting your search"
                    : "Create your first discount to attract more clients!"}
                </p>
                {searchQuery ? (
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    className="mt-4"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Search
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="mt-4 bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800 rounded-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Discount
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
function DiscountsSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 bg-white/50" />
              <Skeleton className="h-4 w-64 mt-2 bg-white/50" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-full bg-white/50" />
              <Skeleton className="h-9 w-32 rounded-full bg-white/50" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-10 w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-9 flex-1 rounded-full" />
                    <Skeleton className="h-9 w-12 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DiscountsPage() {
  return (
    <Suspense fallback={<DiscountsSkeleton />}>
      <DiscountsContent />
    </Suspense>
  );
}
