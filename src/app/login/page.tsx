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
import { Eye, EyeOff } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
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
      console.error("Failed to log security event:", e);
    }
  };

  const handleSubmit = async (values: LoginInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        await logSecurityEvent("login_attempt", `Failed: ${result.error}`);
        toast.error(result.error);
        setError(result.error);
      } else {
        await logSecurityEvent("login_attempt", "Success");
        toast.success("Logged in successfully!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (e) {
      console.error("Login error:", e);
      await logSecurityEvent("login_attempt", "Unexpected error");
      toast.error("An unexpected error occurred");
      setError("An unexpected error occurred");
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
          <div className="flex justify-center mb-4">
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
            welcome back your space for connection and comfort awaits
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email</FormLabel>
                    <FormControl>
                      <Input
                        className="text-sm border-gray-300"
                        placeholder="you@example.com"
                        type="email"
                        autoComplete="email"
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
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
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

          <div className="flex justify-between items-center text-xs mt-3">
            <Link
              href="/resend-verification"
              className="text-gray-600 hover:text-gray-800 hover:underline"
            >
              Resend verification email
            </Link>
            <button
              type="button"
              onClick={() => setIsResetOpen(true)}
              className="text-red-600 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          <ResetPasswordModal
            open={isResetOpen}
            onOpenChange={setIsResetOpen}
          />

          <div className="text-center text-xs text-gray-600 mt-4">
            Don&apos;t have an account?{" "}
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
