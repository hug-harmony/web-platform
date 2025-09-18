/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import login from "../../../public/login.webp";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const logSecurityEvent = async (
    eventType: string,
    details: string,
    userId?: string
  ) => {
    try {
      const ipAddress = await fetch("https://api.ipify.org?format=json")
        .then((res) => res.json())
        .then((data) => data.ip)
        .catch(() => null);

      await fetch("/api/reports/security-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          eventType,
          ipAddress,
          details,
        }),
      });
    } catch (err) {
      console.error("Error logging security event:", err);
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        await logSecurityEvent(
          "login_attempt",
          `Failed login attempt for ${values.email}: ${result.error}`
        );
        toast.error(result.error || "Invalid email or password");
        setError(result.error || "Invalid email or password");
      } else {
        await logSecurityEvent(
          "login_attempt",
          `Successful login for ${values.email}`,
          values.email
        );
        toast.success("Logged in successfully!");
        router.push("/dashboard");
      }
    } catch (error) {
      await logSecurityEvent(
        "login_attempt",
        `Unexpected error during login for ${values.email}`
      );
      toast.error("An unexpected error occurred");
      setError("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signIn("google", { redirect: false });
      if (result?.error) {
        await logSecurityEvent(
          "login_attempt",
          `Failed Google login: ${result.error}`
        );
        toast.error(result.error || "Google login failed");
        setError(result.error || "Google login failed");
      } else {
        await logSecurityEvent("login_attempt", "Successful Google login");
        toast.success("Logged in successfully!");
        router.push("/dashboard");
      }
    } catch (error) {
      await logSecurityEvent(
        "login_attempt",
        "Unexpected error during Google login"
      );
      toast.error("An unexpected error occurred");
      setError("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const result = await res.json();

      if (!res.ok) {
        await logSecurityEvent(
          "password_reset_request",
          `Failed password reset request for ${resetEmail}: ${result.error}`
        );
        if (result.error === "This account uses Google login") {
          toast.error("Please use Google login for this account");
          setResetMessage(
            "This account uses Google login. Try logging in with Google."
          );
          setIsDialogOpen(false);
          return;
        }
        toast.error(result.error || "Failed to send reset email");
        setResetMessage(result.error || "Failed to send reset email");
        throw new Error(result.error || "Failed to send reset email");
      }

      await logSecurityEvent(
        "password_reset_request",
        `Password reset email sent for ${resetEmail}`
      );
      toast.success("Password reset email sent!");
      setResetMessage("Check your email for reset instructions");
      setIsDialogOpen(false);
    } catch (err: any) {
      await logSecurityEvent(
        "password_reset_request",
        `Error during password reset for ${resetEmail}: ${err.message}`
      );
      toast.error(err.message || "Failed to send reset email");
      setResetMessage(err.message || "Failed to send reset email");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="flex flex-col md:flex-row w-full max-w-5xl p-0 overflow-hidden gap-0">
        <div className="w-full md:w-1/2 p-8">
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email</FormLabel>
                    <FormControl>
                      <Input
                        className="text-sm border-gray-300"
                        placeholder="Email"
                        type="email"
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
                    <FormControl>
                      <Input
                        className="text-sm border-gray-300"
                        placeholder="Password"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-[#E7C4BB] text-black text-sm hover:bg-[#d4a8a0] transition-colors"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <div className="text-right text-xs mt-2">
              <DialogTrigger asChild>
                <Link href="#" className="text-red-600 hover:underline">
                  Forgot Password?
                </Link>
              </DialogTrigger>
            </div>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  You will receive an email with a link to reset password
                </DialogDescription>
                <p className="opacity-0">{resetMessage}</p>
              </DialogHeader>
              <form onSubmit={handleResetPassword} className="space-y-2">
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  className="w-full text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Reset Email"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <div className="text-center text-xs text-gray-600 mt-4">
            Don’t have an account?{" "}
            <Link href="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </div>
          <div className="text-center text-xs text-gray-600 mt-4">
            Or login with
          </div>
          <div className="flex justify-center space-x-3 mt-3">
            <Button
              type="button"
              className="bg-white text-black border border-gray-300 w-full text-xs hover:bg-gray-50 flex items-center justify-center space-x-2"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.20-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.02.68-2.31 1.08-3.71 1.08-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4.01 20.07 7.74 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.74 1 4.01 3.93 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google</span>
            </Button>
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
