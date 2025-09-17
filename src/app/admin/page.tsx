"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

import icon from "../../../public/hh-icon.png";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError("Invalid email or password");
        toast.error("Invalid email or password");
        setLoading(false);
        return;
      }

      // Verify admin status via API call
      const response = await fetch("/api/auth/check-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (data.isAdmin) {
        router.push("/admin/dashboard");
      } else {
        setError("You are not authorized to access the admin panel");
        toast.error("You are not authorized to access the admin panel");
        await signOut({ redirect: false });
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="flex items-center justify-center min-h-screen p-4 bg-[#F3CFC6]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-md bg-white border-[#C4C4C4] shadow-md rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-center mb-4 w-24 h-24 mx-auto rounded-full bg-white shadow-md">
            <Image
              src={icon}
              width={300}
              height={300}
              alt="hug harmony icon"
              className="h-16 w-16 object-contain"
            />
          </div>
          <CardTitle className="text-center text-2xl text-black">
            Admin Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-black">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="border-[#C4C4C4] focus:border-[#F3CFC6] text-black"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-black">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="border-[#C4C4C4] focus:border-[#F3CFC6] text-black"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-[#F3CFC6] text-black hover:bg-[#E3BFB6]"
              disabled={loading}
            >
              {loading ? (
                <motion.div
                  className="h-4 w-4 border-2 border-black border-t-transparent rounded-full mr-2"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
              ) : null}
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
