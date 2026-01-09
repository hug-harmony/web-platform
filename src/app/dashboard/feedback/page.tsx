"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  MessageSquarePlus,
  Search,
  Filter,
  RefreshCw,
  Send,
  Keyboard,
  X,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  Megaphone,
  MoreHorizontal,
  ChevronRight,
  Loader2,
  MailOpen,
  FileText,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  FEEDBACK_CATEGORIES,
  OPERATION_STATUSES,
  CATEGORY_LABELS,
  STATUS_COLORS,
  FeedbackCategory,
  OperationStatus,
} from "@/types/operations";

// Animation variants
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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Category icons
const CATEGORY_ICONS: Record<FeedbackCategory, React.ReactNode> = {
  general: <MessageSquare className="h-4 w-4" />,
  bug: <Bug className="h-4 w-4" />,
  feature: <Lightbulb className="h-4 w-4" />,
  complaint: <AlertCircle className="h-4 w-4" />,
  suggestion: <Megaphone className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

// Category colors
const CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  general: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  bug: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  feature:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  complaint:
    "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  suggestion:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
};

interface Feedback {
  id: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
  status: OperationStatus;
  priority: string;
  adminResponse: string | null;
  adminRespondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  adminUser?: {
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface FeedbackStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  withResponse: number;
}

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    category: "" as FeedbackCategory | "",
    subject: "",
    message: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { status: authStatus } = useSession();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut (/ to focus search)
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

  // Fetch feedback
  const fetchFeedback = useCallback(
    async (showRefreshToast = false) => {
      if (authStatus !== "authenticated") return;

      try {
        if (showRefreshToast) setRefreshing(true);
        else setLoading(true);

        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);

        const response = await fetch(`/api/feedback?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch feedback");
        }

        const data = await response.json();
        setFeedbackList(data.feedback || []);

        if (showRefreshToast) {
          toast.success("Feedback refreshed");
        }
      } catch (err) {
        console.error("Fetch feedback error:", err);
        toast.error("Failed to load feedback");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authStatus, statusFilter]
  );

  // Initial fetch
  useEffect(() => {
    if (authStatus === "loading") return;

    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }

    fetchFeedback();
  }, [authStatus, router, fetchFeedback]);

  // Filter feedback
  const filteredFeedback = useMemo(() => {
    return feedbackList.filter((fb) => {
      const matchesSearch = searchQuery
        ? fb.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          fb.message.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const matchesCategory =
        categoryFilter === "all" || fb.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [feedbackList, searchQuery, categoryFilter]);

  // Stats
  const stats: FeedbackStats = useMemo(() => {
    return {
      total: feedbackList.length,
      pending: feedbackList.filter((fb) => fb.status === "pending").length,
      inProgress: feedbackList.filter((fb) => fb.status === "in_progress")
        .length,
      resolved: feedbackList.filter(
        (fb) => fb.status === "resolved" || fb.status === "closed"
      ).length,
      withResponse: feedbackList.filter((fb) => fb.adminResponse).length,
    };
  }, [feedbackList]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.category) {
      errors.category = "Please select a category";
    }
    if (!formData.subject.trim()) {
      errors.subject = "Subject is required";
    } else if (formData.subject.trim().length < 3) {
      errors.subject = "Subject must be at least 3 characters";
    }
    if (!formData.message.trim()) {
      errors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      toast.success("Feedback submitted successfully!");
      setFormData({ category: "", subject: "", message: "" });
      setFormErrors({});
      setIsDialogOpen(false);
      fetchFeedback();
    } catch (err) {
      console.error("Submit feedback error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to submit feedback"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // View feedback details
  const handleViewDetails = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setIsDetailOpen(true);
  };

  // Get status icon
  const getStatusIcon = (status: OperationStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "closed":
        return <CheckCircle2 className="h-4 w-4 text-gray-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading skeleton
  if (authStatus === "loading" || loading) {
    return <FeedbackSkeleton />;
  }

  if (authStatus === "unauthenticated") {
    return null;
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                  <MessageSquarePlus className="h-6 w-6" />
                  Feedback & Support
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  Share your thoughts, report issues, or suggest improvements
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchFeedback(true)}
                  disabled={refreshing}
                  className="rounded-full bg-white/80 hover:bg-white"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>

                {/* New Feedback Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-black hover:bg-black/80 text-white">
                      <Send className="h-4 w-4 mr-2" />
                      New Feedback
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <MessageSquarePlus className="h-5 w-5 text-[#F3CFC6]" />
                        Submit Feedback
                      </DialogTitle>
                      <DialogDescription>
                        We value your input! Let us know how we can improve.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      {/* Category */}
                      <div className="space-y-2">
                        <Label htmlFor="category">
                          Category <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              category: value as FeedbackCategory,
                            }))
                          }
                        >
                          <SelectTrigger
                            className={
                              formErrors.category ? "border-red-500" : ""
                            }
                          >
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {FEEDBACK_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                <div className="flex items-center gap-2">
                                  {CATEGORY_ICONS[cat]}
                                  {CATEGORY_LABELS[cat]}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.category && (
                          <p className="text-xs text-red-500">
                            {formErrors.category}
                          </p>
                        )}
                      </div>

                      {/* Subject */}
                      <div className="space-y-2">
                        <Label htmlFor="subject">
                          Subject <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="subject"
                          placeholder="Brief summary of your feedback"
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              subject: e.target.value,
                            }))
                          }
                          className={formErrors.subject ? "border-red-500" : ""}
                          maxLength={200}
                        />
                        {formErrors.subject && (
                          <p className="text-xs text-red-500">
                            {formErrors.subject}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 text-right">
                          {formData.subject.length}/200
                        </p>
                      </div>

                      {/* Message */}
                      <div className="space-y-2">
                        <Label htmlFor="message">
                          Message <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="message"
                          placeholder="Describe your feedback in detail..."
                          value={formData.message}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              message: e.target.value,
                            }))
                          }
                          className={`min-h-[120px] ${
                            formErrors.message ? "border-red-500" : ""
                          }`}
                          maxLength={5000}
                        />
                        {formErrors.message && (
                          <p className="text-xs text-red-500">
                            {formErrors.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 text-right">
                          {formData.message.length}/5000
                        </p>
                      </div>

                      <DialogFooter className="gap-2">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-black"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Submit Feedback
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </motion.div>
        </CardHeader>

        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <FileText className="h-3 w-3" />
                Total
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
              <p className="text-2xl font-bold text-blue-600">
                {stats.inProgress}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Loader2 className="h-3 w-3" />
                In Progress
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.resolved}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.withResponse}
              </p>
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <MailOpen className="h-3 w-3" />
                Responded
              </p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Search */}
            <div className="relative flex-grow w-full">
              <Search
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search your feedback... (press / to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 py-3 rounded-lg border bg-white shadow-sm focus:ring-2 focus:ring-[#F3CFC6]/50"
                aria-label="Search feedback"
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

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] bg-white shadow-sm">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {OPERATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[150px] bg-white shadow-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {FEEDBACK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex items-center gap-2">
                      {CATEGORY_ICONS[cat]}
                      {CATEGORY_LABELS[cat]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(searchQuery ||
              statusFilter !== "all" ||
              categoryFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
                className="bg-white shadow-sm"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-black">
            <Inbox className="mr-2 h-5 w-5 text-[#F3CFC6]" />
            Your Feedback History
            {filteredFeedback.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredFeedback.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <motion.div className="space-y-3" variants={containerVariants}>
              <AnimatePresence>
                {filteredFeedback.length > 0 ? (
                  filteredFeedback.map((feedback) => (
                    <motion.div
                      key={feedback.id}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      whileHover={{
                        scale: 1.01,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                      transition={{ duration: 0.2 }}
                      className={`p-4 border rounded-lg transition-all cursor-pointer ${
                        feedback.adminResponse
                          ? "bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800"
                          : "bg-white border-gray-200 hover:border-[#F3CFC6]/50 dark:bg-gray-900 dark:border-gray-700"
                      }`}
                      onClick={() => handleViewDetails(feedback)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left side */}
                        <div className="flex-1 min-w-0">
                          {/* Category & Status badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge
                              className={CATEGORY_COLORS[feedback.category]}
                            >
                              <span className="flex items-center gap-1">
                                {CATEGORY_ICONS[feedback.category]}
                                {CATEGORY_LABELS[feedback.category]}
                              </span>
                            </Badge>
                            <Badge
                              className={
                                STATUS_COLORS[feedback.status] ||
                                STATUS_COLORS.pending
                              }
                            >
                              <span className="flex items-center gap-1">
                                {getStatusIcon(feedback.status)}
                                {feedback.status
                                  .replace("_", " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </span>
                            </Badge>
                            {feedback.adminResponse && (
                              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                <MailOpen className="h-3 w-3 mr-1" />
                                Response received
                              </Badge>
                            )}
                          </div>

                          {/* Subject */}
                          <h3 className="font-semibold text-black dark:text-white truncate">
                            {feedback.subject}
                          </h3>

                          {/* Message preview */}
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {feedback.message}
                          </p>

                          {/* Date */}
                          <p className="text-xs text-gray-500 mt-2">
                            Submitted: {formatDate(feedback.createdAt)}
                          </p>
                        </div>

                        {/* Right side - Arrow */}
                        <div className="flex items-center">
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <MessageSquarePlus className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg font-medium">No feedback found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchQuery ||
                      statusFilter !== "all" ||
                      categoryFilter !== "all"
                        ? "Try adjusting your filters"
                        : "You haven't submitted any feedback yet"}
                    </p>
                    {!searchQuery &&
                      statusFilter === "all" &&
                      categoryFilter === "all" && (
                        <Button
                          onClick={() => setIsDialogOpen(true)}
                          className="mt-4 bg-[#F3CFC6] hover:bg-[#e9bfb5] text-black"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Submit Your First Feedback
                        </Button>
                      )}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Feedback Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={CATEGORY_COLORS[selectedFeedback.category]}>
                    <span className="flex items-center gap-1">
                      {CATEGORY_ICONS[selectedFeedback.category]}
                      {CATEGORY_LABELS[selectedFeedback.category]}
                    </span>
                  </Badge>
                  <Badge
                    className={
                      STATUS_COLORS[selectedFeedback.status] ||
                      STATUS_COLORS.pending
                    }
                  >
                    <span className="flex items-center gap-1">
                      {getStatusIcon(selectedFeedback.status)}
                      {selectedFeedback.status
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </Badge>
                </div>
                <DialogTitle className="text-xl">
                  {selectedFeedback.subject}
                </DialogTitle>
                <DialogDescription>
                  Submitted on {formatDate(selectedFeedback.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Your Message */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">
                    Your Message
                  </Label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedFeedback.message}
                    </p>
                  </div>
                </div>

                {/* Admin Response */}
                {selectedFeedback.adminResponse ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-green-600 flex items-center gap-1">
                      <MailOpen className="h-4 w-4" />
                      Response from Support
                    </Label>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {selectedFeedback.adminResponse}
                      </p>
                      {selectedFeedback.adminRespondedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Responded on{" "}
                          {formatDate(selectedFeedback.adminRespondedAt)}
                          {selectedFeedback.adminUser && (
                            <span>
                              {" "}
                              by {selectedFeedback.adminUser.firstName}{" "}
                              {selectedFeedback.adminUser.lastName}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                      <Clock className="h-4 w-4" />
                      <p className="text-sm font-medium">Awaiting response</p>
                    </div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Our team will review and respond to your feedback soon.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// Skeleton loader
function FeedbackSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-56 bg-white/50" />
              <Skeleton className="h-4 w-72 mt-2 bg-white/50" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-full bg-white/50" />
              <Skeleton className="h-9 w-32 bg-white/50" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg bg-white/50" />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton className="h-12 flex-1 bg-white/50" />
            <Skeleton className="h-12 w-36 bg-white/50" />
            <Skeleton className="h-12 w-36 bg-white/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
