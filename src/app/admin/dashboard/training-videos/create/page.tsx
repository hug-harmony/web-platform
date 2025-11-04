"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, ArrowLeft, Link2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";

export default function CreateTrainingVideoPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    url: "",
    durationSec: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) {
      toast.error("Name and URL are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/trainingvideos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          url: form.url.trim(),
          durationSec: form.durationSec ? Number(form.durationSec) : null,
          isActive: form.isActive,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success("Training video uploaded");
      router.push("/admin/dashboard/training-videos");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(String(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href="/admin/dashboard/training-videos">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <CardTitle className="flex items-center text-2xl font-bold">
              <Video className="mr-2 h-6 w-6" />
              Upload Training Video
            </CardTitle>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Video Title</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Specialist Onboarding 2025"
                className="border-[#C4C4C4] focus:ring-[#F3CFC6]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Video URL</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-3 h-4 w-4 text-[#C4C4C4]" />
                <Input
                  id="url"
                  required
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6]"
                />
              </div>
              <p className="text-xs text-[#C4C4C4]">
                YouTube, Vimeo, or direct MP4 link
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={form.durationSec}
                  onChange={(e) =>
                    setForm({ ...form, durationSec: e.target.value })
                  }
                  placeholder="180"
                  className="border-[#C4C4C4] focus:ring-[#F3CFC6]"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Button
                  type="button"
                  variant={form.isActive ? "default" : "outline"}
                  className={`w-full ${form.isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                >
                  {form.isActive ? "Published" : "Draft"}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black"
              disabled={saving}
            >
              {saving ? "Uploading..." : "Upload Video"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
