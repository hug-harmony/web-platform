// app/dashboard/profile/professional-application/page.tsx
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
      toast.error("Please set your name in profile first.");
      return;
    }

    try {
      const res = await fetch("/api/professionals/onboarding/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to submit");
        if (res.status === 401) router.push("/login");
        return;
      }

      toast.success("Application submitted! Redirecting to video...");
      setIsDialogOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Error submitting application");
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    router.push("/dashboard/profile/professional-application/video");
  };

  if (status === "loading") return <LoadingSkeleton />;
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
                Become a Professional
              </CardTitle>
              <p className="text-sm text-black">
                Step 1: Submit your application
              </p>
            </motion.div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard">
                <MessageSquare className="mr-2 h-4 w-4" /> Back
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="space-y-4 pt-6">
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="biography">Biography</Label>
                <Textarea
                  id="biography"
                  value={formData.biography}
                  onChange={(e) =>
                    setFormData({ ...formData, biography: e.target.value })
                  }
                  placeholder="Tell us about your experience..."
                  className="border-[#F3CFC6] focus:ring-[#F3CFC6]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Rate ($/hour)</Label>
                <Input
                  id="rate"
                  type="number"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: e.target.value })
                  }
                  placeholder="50"
                  className="border-[#F3CFC6] focus:ring-[#F3CFC6]"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={
                  !formData.biography || !formData.rate || !session?.user?.name
                }
                className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black rounded-full"
              >
                Submit & Watch Video
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Application Submitted!</DialogTitle>
            <DialogDescription>
              You&apos;re one step closer. Now watch the onboarding video.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={handleDialogClose}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] rounded-full"
            >
              Continue to Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-40 rounded-full" />
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardContent className="space-y-4 pt-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className={`h-${i === 0 ? 20 : 10} w-full`} />
            </div>
          ))}
          <Skeleton className="h-10 w-40 rounded-full" />
        </CardContent>
      </Card>
    </div>
  );
}
