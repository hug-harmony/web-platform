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
import { Eye, EyeOff } from "lucide-react";

import icon from "../../../public/hh-icon.png";

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        identifier,
        password,
      });

      if (result?.error) {
        setError("Invalid email/username or password");
        toast.error("Invalid email/username or password");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/check-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier }),
      });
      const data = await response.json();

      if (data.isAdmin) {
        toast.success("Logged in successfully!");
        router.push("/admin/dashboard");
      } else {
        setError("Not authorized for admin panel");
        toast.error("Not authorized for admin panel");
        await signOut({ redirect: false });
      }
    } catch {
      setError("Login failed. Try again.");
      toast.error("Login failed. Try again.");
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
      <Card className="w-full max-w-md bg-white border-[#C4C4C4] shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-md">
            <Image
              src={icon}
              width={64}
              height={64}
              alt="Hug Harmony"
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl text-black">Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="identifier" className="text-black">
                Email or Username
              </Label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter email or username"
                className="mt-1 border-[#C4C4C4] focus:border-[#F3CFC6] focus:ring-[#F3CFC6] text-black"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-black">
                Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter password"
                  className="pr-10 border-[#C4C4C4] focus:border-[#F3CFC6] focus:ring-[#F3CFC6] text-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-black"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 animate-pulse">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#F3CFC6] text-black hover:bg-[#E3BFB6] font-medium transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <motion.div
                    className="mr-2 h-4 w-4 rounded-full border-2 border-black border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                  />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
