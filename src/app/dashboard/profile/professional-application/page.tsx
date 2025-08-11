"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, User } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  if (status === "loading") return <div className="p-4">Loading...</div>;
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }
  const handleSubmit = () => {
    // Add submission logic here
    console.log("Form submitted:", formData);
  };
  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card>
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl">Professional Application</CardTitle>
            <p className="text-muted-foreground">
              Apply to become a specialist
            </p>
          </motion.div>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div variants={itemVariants} className="flex space-x-4">
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <MessageSquare className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                Back to Profile
              </Link>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Enter your location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                placeholder="Enter your professional role"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Specialty Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="Enter tags (e.g., therapy, counseling)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="education">Education</Label>
              <Textarea
                id="education"
                value={formData.education}
                onChange={(e) =>
                  setFormData({ ...formData, education: e.target.value })
                }
                placeholder="Enter your educational background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license">License</Label>
              <Input
                id="license"
                value={formData.license}
                onChange={(e) =>
                  setFormData({ ...formData, license: e.target.value })
                }
                placeholder="Enter your license details"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biography">Biography</Label>
              <Textarea
                id="biography"
                value={formData.biography}
                onChange={(e) =>
                  setFormData({ ...formData, biography: e.target.value })
                }
                placeholder="Enter your professional biography"
              />
            </div>
            <Button variant="default" onClick={handleSubmit}>
              Submit Application
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
