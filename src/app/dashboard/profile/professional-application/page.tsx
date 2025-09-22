"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SpecialistApplication {
  biography: string;
  rate: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ProfessionalApplicationPage() {
  const [formData, setFormData] = useState<SpecialistApplication>({
    biography: "",
    rate: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!session?.user?.name) {
      console.error("Error: User must have a name to submit application");
      toast.error("User must have a name to submit application");
      return;
    }

    try {
      const response = await fetch("/api/specialists/application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Specialist API error:", response.status, errorData);
        toast.error(`Failed to submit application: ${errorData.error}`);
        if (response.status === 401) {
          router.push("/login");
        }
        throw new Error(`Failed to submit application: ${errorData.error}`);
      }

      const result = await response.json();
      console.log("Application submitted successfully:", result);
      toast.success("Application submitted successfully!");
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Error submitting application");
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    router.push("/dashboard");
  };

  if (status === "loading") {
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
              <Skeleton className="h-4 w-64 bg-[#C4C4C4]/50" />
            </div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="space-y-4 pt-6">
            {[...Array(2)].map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24 bg-[#C4C4C4]/50" />
                <Skeleton
                  className={`h-${index === 0 ? 20 : 10} w-full bg-[#C4C4C4]/50`}
                />
              </div>
            ))}
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <>
      <motion.div
        className="p-4 space-y-6 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl text-black dark:text-white">
                Professional Application
              </CardTitle>
              <p className="text-sm text-black">
                Apply to become a specialist. Your name (
                {session?.user?.name || "Not set"}) and profile picture will be
                used for your specialist profile.
              </p>
            </motion.div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <motion.div
              variants={itemVariants}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
              }}
              transition={{ duration: 0.2 }}
            >
              <Button
                asChild
                variant="outline"
                className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
              >
                <Link href="/dashboard">
                  <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
                  Back to Dashboard
                </Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="space-y-4 pt-6">
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="biography"
                  className="text-black dark:text-white"
                >
                  Biography
                </Label>
                <Textarea
                  id="biography"
                  value={formData.biography}
                  onChange={(e) =>
                    setFormData({ ...formData, biography: e.target.value })
                  }
                  placeholder="Enter your professional biography"
                  className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                  aria-label="Biography"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate" className="text-black dark:text-white">
                  Rate ($)
                </Label>
                <Input
                  id="rate"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: e.target.value })
                  }
                  placeholder="Enter your rate (e.g., 50)"
                  className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
                  aria-label="Rate"
                  type="number"
                />
              </div>
              <Button
                onClick={handleSubmit}
                className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
                disabled={!session?.user?.name}
              >
                Submit Application
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Application Submitted</DialogTitle>
            <DialogDescription>
              Your application has been successfully submitted. You will be
              notified when it is approved by the admin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={handleDialogClose}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
