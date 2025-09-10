"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DiscountsPage() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const specialistId = searchParams.get("specialistId");
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    rate: "",
    discount: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }

    const fetchSpecialistData = async () => {
      if (!specialistId) {
        toast.error("You are not an approved specialist.");

        redirect("/dashboard");
      }

      try {
        const res = await fetch("/api/users/me", { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) redirect("/login");
          throw new Error("Failed to fetch user data");
        }
        const userData = await res.json();
        const application = userData.specialistApplication;
        if (
          application?.status !== "approved" ||
          application.specialistId !== specialistId
        ) {
          toast.error("You are not an approved specialist.");

          redirect("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching specialist data:", error);
        toast.error("Failed to fetch specialist data.");

        redirect("/dashboard");
      }
    };

    const fetchDiscounts = async () => {
      if (!specialistId) return;
      try {
        const res = await fetch(`/api/discounts/specialist/${specialistId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch discounts");
        }
        const data = await res.json();
        setDiscounts(data);
      } catch (error) {
        console.error("Error fetching discounts:", error);
        toast.error("Failed to load discounts.");
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialistData();
    fetchDiscounts();
  }, [specialistId, status]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const body = {
        name: formData.name,
        rate: parseFloat(formData.rate),
        discount: parseFloat(formData.discount),
        specialistId,
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
      } else {
        setDiscounts((prev) => [...prev, newDiscount]);
      }

      toast.success(
        `Discount ${editingDiscount ? "updated" : "created"} successfully.`
      );

      setIsDialogOpen(false);
      setFormData({ name: "", rate: "", discount: "" });
      setEditingDiscount(null);
    } catch (error) {
      console.error("Error saving discount:", error);
      toast.error("Failed to save discount.");
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      rate: discount.rate.toString(),
      discount: discount.discount.toString(),
    });
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
      toast.success("Discount deleted successfully.");
    } catch (error) {
      console.error("Error deleting discount:", error);
      toast.error("Failed to delete discount.");
    }
  };

  if (status === "loading") {
    return <p className="text-center text-[#C4C4C4]">Loading...</p>;
  }

  return (
    <motion.div
      className="space-y-6 w-full max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Manage Discounts</CardTitle>
          <p className="text-sm opacity-80">
            Create and manage your discount offers
          </p>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="flex items-center space-x-2 bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80"
                onClick={() => {
                  setEditingDiscount(null);
                  setFormData({
                    name: "",
                    rate: "",
                    discount: "",
                  });
                }}
              >
                <Plus className="h-5 w-5" />
                <span>Add Discount</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-gray-800">
              <DialogHeader>
                <DialogTitle>
                  {editingDiscount ? "Edit Discount" : "Create Discount"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., New Client Offer"
                    className="text-black dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="rate">Rate ($)</Label>
                  <Input
                    id="rate"
                    name="rate"
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={handleInputChange}
                    placeholder="e.g., 100"
                    className="text-black dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    name="discount"
                    type="number"
                    step="0.01"
                    value={formData.discount}
                    onChange={handleInputChange}
                    placeholder="e.g., 20"
                    className="text-black dark:text-white"
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80"
                >
                  {editingDiscount ? "Update Discount" : "Create Discount"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-black dark:text-white">
            Your Discounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-[#C4C4C4]">Loading...</p>
          ) : discounts.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
              variants={containerVariants}
            >
              <AnimatePresence>
                {discounts.map((discount) => (
                  <motion.div
                    key={discount.id}
                    variants={cardVariants}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 transition-colors">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-6 w-6 text-[#F3CFC6]" />
                            <div>
                              <h3 className="font-semibold">{discount.name}</h3>
                              <p className="text-sm text-[#C4C4C4]">
                                {discount.discount}% off ${discount.rate}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(discount)}
                              className="text-[#F3CFC6] border-[#F3CFC6]"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(discount.id)}
                              className="text-red-500 border-red-500"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <p className="text-center text-[#C4C4C4]">No discounts found.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
