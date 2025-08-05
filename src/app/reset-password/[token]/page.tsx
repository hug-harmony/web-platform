/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { toast } from "sonner";

const formSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const { token } = useParams();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token");
      toast("Something went wrong");
    }
  }, [token]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!token) {
      setError("Invalid or missing reset token");
      toast("Something went wrong");
      return;
    }
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }
      setMessage("Password reset successfully. Redirecting to login...");
      toast("Password reset successful!");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.message);
      toast("Something went wrong");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Set New Password
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          Enter your new password to reset your account.
        </p>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {message && <p className="text-green-600 text-sm mb-4">{message}</p>}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    New Password
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-10 text-sm border-gray-300"
                      placeholder="Enter new password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-10 text-sm border-gray-300"
                      placeholder="Confirm new password"
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
              className="w-full bg-[#E7C4BB] text-black h-10 text-sm hover:bg-[#d4a8a0] transition-colors"
              disabled={!token}
            >
              Reset Password
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
