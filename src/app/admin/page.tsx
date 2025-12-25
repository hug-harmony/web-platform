"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import icon from "../../../public/hh-icon.png";

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: identifier.trim().toLowerCase(),
        password,
      });

      if (result?.error) {
        toast.error("Invalid credentials");
        return;
      }

      const check = await fetch("/api/auth/check-admin", {
        method: "POST",
        body: JSON.stringify({ email: identifier.trim().toLowerCase() }),
      });
      const data = await check.json();

      if (data.isAdmin) {
        toast.success("Welcome back, Guardian of Harmony ✨");
        router.push("/admin/dashboard");
      } else {
        await signOut({ redirect: false });
        toast.error("Access restricted to admin only");
      }
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF4F3] via-[#FFF8F6] to-[#FEEEEB] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Floating Orbs - Hug Harmony Style */}
      <motion.div
        animate={{ y: [0, -30, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-10 left-20 w-96 h-96 bg-[#F3CFC6]/30 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 40, 0], rotate: [0, -15, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 right-10 w-80 h-80 bg-[#E7C4BB]/25 rounded-full blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg"
      >
        <Card className="backdrop-blur-xl bg-white/70 border-[#F3CFC6]/40 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#F3CFC6]/10 to-[#E7C4BB]/5" />

          <div className="relative p-10 text-center">
            {/* Logo + Shield Badge */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-[#F3CFC6] to-[#E7C4BB] p-1 shadow-xl">
                <div className="w-full h-full rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center">
                  <Image src={icon} width={72} height={72} alt="Hug Harmony" />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-gray-800 mt-6">
                Admin Portal
              </h1>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Shield className="w-5 h-5 text-[#E7C4BB]" />
                <p className="text-[#E7C4BB] font-medium text-sm tracking-wider">
                  SECURE ACCESS ONLY
                </p>
              </div>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-6 mt-10">
              <div className="relative">
                <Input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder=" "
                  className="peer h-14 px-5 text-lg bg-white/60 border-[#F3CFC6]/50 
                           focus:border-[#E7C4BB] focus:ring-[#E7C4BB]/30
                           placeholder-transparent backdrop-blur-sm"
                />
                <Label
                  className="absolute left-5 top-4 text-gray-600 text-base 
                                 transition-all duration-300 pointer-events-none
                                 peer-focus:top-2 peer-focus:text-xs peer-focus:text-[#E7C4BB]
                                 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
                >
                  Email or Username
                </Label>
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder=" "
                  className="peer h-14 px-5 pr-14 text-lg bg-white/60 border-[#F3CFC6]/50 
                           focus:border-[#E7C4BB] focus:ring-[#E7C4BB]/30
                           placeholder-transparent backdrop-blur-sm"
                />
                <Label
                  className="absolute left-5 top-4 text-gray-600 text-base 
                                 transition-all duration-300 pointer-events-none
                                 peer-focus:top-2 peer-focus:text-xs peer-focus:text-[#E7C4BB]
                                 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
                >
                  Master Password
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#E7C4BB] transition"
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !identifier || !password}
                className="w-full h-14 text-lg font-semibold rounded-xl
                         bg-gradient-to-r from-[#F3CFC6] to-[#E7C4BB] text-black
                         hover:from-[#e8bfaf] hover:to-[#d8b0a5]
                         shadow-xl hover:shadow-[#F3CFC6]/60
                         transition-all duration-300"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Enter Admin Sanctuary"
                )}
              </Button>
            </form>

            <p className="mt-10 text-xs text-gray-500 tracking-wider">
              HUG HARMONY © 2025 — PROTECTED WITH LOVE
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
