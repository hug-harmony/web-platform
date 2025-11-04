"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, ArrowLeft, Link2, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface TrainingVideo {
  id: string;
  name: string;
  url: string;
  durationSec?: number | null;
  isActive: boolean;
}

export default function EditTrainingVideoPage() {
  const { id } = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<TrainingVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== "string" || id.length !== 24) {
      toast.error("Invalid video ID");
      router.push("/admin/dashboard/training-videos");
      return;
    }

    fetch(`/api/trainingvideos/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setVideo(data))
      .catch(() => toast.error("Failed to load video"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video || !video.name.trim() || !video.url.trim()) {
      toast.error("Name and URL are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/trainingvideos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: video.name.trim(),
          url: video.url.trim(),
          durationSec: video.durationSec ? Number(video.durationSec) : null,
          isActive: video.isActive,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success("Video updated");
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

  const handleDelete = async () => {
    if (!confirm("Delete this video permanently?")) return;
    try {
      const res = await fetch(`/api/trainingvideos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success("Video deleted");
      router.push("/admin/dashboard/training-videos");
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <p className="text-center py-8">Loading...</p>;
  if (!video)
    return <p className="text-center py-8 text-red-500">Video not found</p>;

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
              Edit Training Video
            </CardTitle>
          </div>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
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
                value={video.name}
                onChange={(e) => setVideo({ ...video, name: e.target.value })}
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
                  value={video.url}
                  onChange={(e) => setVideo({ ...video, url: e.target.value })}
                  className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={video.durationSec ?? ""}
                  onChange={(e) =>
                    setVideo({
                      ...video,
                      durationSec: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="border-[#C4C4C4] focus:ring-[#F3CFC6]"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Button
                  type="button"
                  variant={video.isActive ? "default" : "outline"}
                  className={`w-full ${video.isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                  onClick={() =>
                    setVideo({ ...video, isActive: !video.isActive })
                  }
                >
                  {video.isActive ? "Published" : "Draft"}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
