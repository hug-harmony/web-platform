"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function SettingsPage() {
  const [companyCutPercentage, setCompanyCutPercentage] = useState<number>(20);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchCompanyCut() {
      try {
        const response = await fetch("/api/settings/company-cut");
        if (!response.ok) throw new Error("Failed to fetch company cut");
        const data = await response.json();
        setCompanyCutPercentage(data.companyCutPercentage);
      } catch (error) {
        console.error("Fetch company cut error:", error);
        toast.error("Failed to load company cut percentage");
      } finally {
        setLoading(false);
      }
    }
    fetchCompanyCut();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (companyCutPercentage < 0 || companyCutPercentage > 100) {
      toast.error("Company cut percentage must be between 0 and 100");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/settings/company-cut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCutPercentage }),
      });
      if (!response.ok) throw new Error("Failed to update company cut");
      toast.success("Company cut percentage updated successfully");
    } catch (error) {
      console.error("POST company cut error:", error);
      toast.error("Failed to update company cut percentage");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Settings</CardTitle>
          <p className="text-sm opacity-80">Manage application settings</p>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label
                  htmlFor="companyCutPercentage"
                  className="text-black dark:text-white"
                >
                  Company Cut Percentage
                </Label>
                <Input
                  id="companyCutPercentage"
                  type="number"
                  value={companyCutPercentage}
                  onChange={(e) =>
                    setCompanyCutPercentage(Number(e.target.value))
                  }
                  className="border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
