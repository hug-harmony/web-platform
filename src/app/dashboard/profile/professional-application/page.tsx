/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, User } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface SpecialistApplication {
  name: string;
  location: string;
  biography: string;
  education: string;
  license: string;
  role: string;
  tags: string;
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
    name: "",
    location: "",
    biography: "",
    education: "",
    license: "",
    role: "",
    tags: "",
  });
  const { data: session, status } = useSession();
  const router = useRouter();

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
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="space-y-4 pt-6">
            {[...Array(7)].map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24 bg-[#C4C4C4]/50" />
                <Skeleton
                  className={`h-${index === 4 || index === 6 ? 20 : 10} w-full bg-[#C4C4C4]/50`}
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

  const handleSubmit = async () => {
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
        const errorData = await response.text();
        console.error("Specialist API error:", response.status, errorData);
        if (response.status === 401) {
          router.push("/login");
        }
        throw new Error(`Failed to submit application: ${response.status}`);
      }

      const result = await response.json();
      console.log("Application submitted successfully:", result);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error submitting application:", error);
    }
  };

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl text-black dark:text-white">
              Professional Application
            </CardTitle>
            <p className="text-sm text-black">Apply to become a specialist</p>
          </motion.div>
        </CardHeader>
        <CardContent className="flex space-x-4">
          {[
            {
              href: "/dashboard",
              label: "Back to Dashboard",
              icon: <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />,
            },
            {
              href: "/profile",
              label: "Back to Profile",
              icon: <User className="mr-2 h-4 w-4 text-[#F3CFC6]" />,
            },
          ].map((item) => (
            <motion.div
              key={item.href}
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
                <Link href={item.href}>
                  {item.icon} {item.label}
                </Link>
              </Button>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Content Section */}
      <Card className="shadow-lg">
        <CardContent className="space-y-4 pt-6">
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-black dark:text-white">
                Full Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter your full name"
                className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="text-black dark:text-white">
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Enter your location"
                className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-black dark:text-white">
                Role
              </Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                placeholder="Enter your professional role"
                className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-black dark:text-white">
                Specialty Tags
              </Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="Enter tags (e.g., therapy, counseling)"
                className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="education" className="text-black dark:text-white">
                Education
              </Label>
              <Textarea
                id="education"
                value={formData.education}
                onChange={(e) =>
                  setFormData({ ...formData, education: e.target.value })
                }
                placeholder="Enter your educational background"
                className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license" className="text-black dark:text-white">
                License
              </Label>
              <Input
                id="license"
                value={formData.license}
                onChange={(e) =>
                  setFormData({ ...formData, license: e.target.value })
                }
                placeholder="Enter your license details"
                className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biography" className="text-black dark:text-white">
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
              />
            </div>
            <Button
              onClick={handleSubmit}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
            >
              Submit Application
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
