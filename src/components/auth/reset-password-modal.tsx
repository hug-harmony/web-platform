/* eslint-disable @typescript-eslint/no-explicit-any */
// components/auth/reset-password-modal.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ResetPasswordModal({ open, onOpenChange }: Props) {
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const payload =
        method === "email" ? { email: identifier } : { phone: identifier };

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "This account uses Google login") {
          toast.error("Use Google to log in");
          setMessage("This account uses Google login.");
          return;
        }
        throw new Error(data.error || "Failed to send reset link");
      }

      toast.success("Reset link sent!");
      setMessage(
        method === "email"
          ? "Check your email for the reset link."
          : "Check your phone for the reset link (SMS)."
      );
      setTimeout(() => onOpenChange(false), 2000);
    } catch (err: any) {
      toast.error(err.message);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Your Password</DialogTitle>
          <DialogDescription>
            Choose to receive the reset link via <strong>email</strong> or{" "}
            <strong>phone</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={method === "email" ? "default" : "outline"}
              size="sm"
              onClick={() => setMethod("email")}
              className="flex-1"
            >
              Email
            </Button>
            <Button
              type="button"
              variant={method === "phone" ? "default" : "outline"}
              size="sm"
              onClick={() => setMethod("phone")}
              className="flex-1"
            >
              Phone
            </Button>
          </div>

          <Input
            type={method === "email" ? "email" : "tel"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={
              method === "email" ? "you@example.com" : "+1 415 555 2671"
            }
            required
            disabled={loading}
          />

          {method === "phone" && (
            <p className="text-xs text-gray-500">
              Use international format (e.g., +14155552671)
            </p>
          )}

          {message && <p className="text-sm text-green-600">{message}</p>}

          <Button
            type="submit"
            className="w-full text-sm"
            disabled={loading || !identifier.trim()}
          >
            {loading ? "Sending…" : "Send Reset Link"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
