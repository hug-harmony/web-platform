// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import login from "../../../public/login.webp";
import logo from "../../../public/hh-logo.png";
import ResetPasswordModal from "@/components/auth/reset-password-modal";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AppleSignInButton } from "@/components/auth/apple-sign-in-button";
import { FacebookSignInButton } from "@/components/auth/facebook-sign-in-button";

const formSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email or username is required")
    .refine(
      (val) => {
        const v = val.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        const isUsername = /^[a-zA-Z0-9_]{3,20}$/.test(v);
        return isEmail || isUsername;
      },
      { message: "Enter a valid email or username (3–20 chars)" }
    ),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const logSecurityEvent = async (
    eventType: string,
    details: string,
    userId?: string
  ) => {
    try {
      const ip = await fetch("https://api.ipify.org?format=json")
        .then((r) => r.json())
        .then((d) => d.ip)
        .catch(() => null);
      await fetch("/api/reports/security-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, eventType, ipAddress: ip, details }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        identifier: values.identifier.trim(),
        password: values.password,
        redirect: false,
      });
      if (result?.error) {
        await logSecurityEvent("login_attempt", `Failed: ${result.error}`);
        toast.error(result.error);
        setError(result.error);
      } else {
        await logSecurityEvent("login_attempt", "Success");
        toast.success("Logged in!");
        router.push("/dashboard");
      }
    } catch (e) {
      console.error(e);
      await logSecurityEvent("login_attempt", "Unexpected error");
      toast.error("Unexpected error");
      setError("Unexpected error");
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const caps = e.getModifierState?.("CapsLock");
    setCapsLockOn(!!caps);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="flex flex-col md:flex-row w-full max-w-5xl p-0 overflow-hidden gap-0">
        <div className="w-full md:w-1/2 p-8">
          <div className="flex justify-start mb-4">
            <Image
              src={logo}
              alt="Hug Harmony Logo"
              width={120}
              height={40}
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Login</h1>
          <p className="text-gray-600 text-sm mb-6">
            Login to access your Hug Harmony account
          </p>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Email or Username
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="text-sm border-gray-300"
                        placeholder="you@example.com or username"
                        type="text"
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Password
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          className="text-sm border-gray-300 pr-20"
                          placeholder="Password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          {...field}
                          onKeyUp={onPasswordKey}
                          onKeyDown={onPasswordKey}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </Button>
                    </div>
                    {capsLockOn && (
                      <p className="text-xs text-amber-600 mt-1">
                        Caps Lock is ON
                      </p>
                    )}
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-[#E7C4BB] text-black text-sm hover:bg-[#d4a8a0]"
                disabled={isLoading}
              >
                {isLoading ? "Logging in…" : "Login"}
              </Button>
            </form>
          </Form>

          {/* Forgot Password Trigger */}
          <div className="text-right text-xs mt-2">
            <button
              type="button"
              onClick={() => setIsResetOpen(true)}
              className="text-red-600 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {/* Reusable Modal */}
          <ResetPasswordModal
            open={isResetOpen}
            onOpenChange={setIsResetOpen}
          />

          <div className="text-center text-xs text-gray-600 mt-4">
            Don’t have an account?{" "}
            <Link href="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or login with</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="flex flex-col gap-3">
            <GoogleSignInButton disabled={isLoading} />
            <AppleSignInButton disabled={isLoading} />
            <FacebookSignInButton disabled={isLoading} />
          </div>
        </div>

        <div className="hidden md:flex w-1/2 relative">
          <Image
            src={login}
            alt="Login background"
            fill
            style={{ objectFit: "cover" }}
          />
        </div>
      </Card>
    </div>
  );
}
