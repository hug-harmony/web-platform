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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

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

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error || "Invalid email or password");
        setError(result.error);
      } else {
        toast.success("Logged in successfully!");
        router.push("/dashboard/homePage");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      setError("An unexpected error occurred");
      console.log(error);
      console.log(resetMessage);
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
        if (result.error === "This account uses Google login") {
          toast.error("Please use Google login for this account");
          setResetMessage(
            "This account uses Google login. Try logging in with Google."
          );
          setIsDialogOpen(false);
          return;
        }
        toast.error(result.error || "Failed to send reset email");
        throw new Error(result.error || "Failed to send reset email");
      }

      toast.success("Password reset email sent!");
      setResetMessage("Check your email for reset instructions");
      setIsDialogOpen(false);
    } catch (err: any) {
      console.log(err);
      toast.error(err.message || "Failed to send reset email");
      setResetMessage(err.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="flex flex-col md:flex-row w-full max-w-5xl bg-white rounded-xl shadow-lg overflow-hidden">
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
                        className="h-10 text-sm border-gray-300"
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
                        className="h-10 text-sm border-gray-300"
                        placeholder="Password"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-xs text-gray-600">Remember me</label>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#E7C4BB] text-black h-10 text-sm hover:bg-[#d4a8a0] transition-colors"
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
                  Forgot Password
                </Link>
              </DialogTrigger>
            </div>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
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
                  className="w-full h-10 text-sm"
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
              className="bg-white text-red-600 border border-gray-300 rounded-full h-10 w-full text-xs hover:bg-gray-50 flex items-center justify-center space-x-2"
              onClick={() =>
                signIn("google", { callbackUrl: "/dashboard/homePage" })
              }
              disabled={isLoading}
            >
              <Image
                src="/google_logo.svg"
                alt="Google logo"
                width={20}
                height={20}
                className="h-5 w-5"
              />
              <span>Google</span>
            </Button>
          </div>
        </div>
        <div
          className="hidden md:flex w-1/2 items-center justify-center bg-cover bg-center p-8"
          style={{ backgroundImage: "url('/login.png')" }}
        ></div>
      </div>
    </div>
  );
}
