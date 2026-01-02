// src/app/admin/dashboard/training-videos/create/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Video,
  ArrowLeft,
  Upload,
  Link2,
  X,
  Clock,
  FileVideo,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useRef, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DurationInput {
  hours: string;
  minutes: string;
  seconds: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function CreateTrainingVideoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    url: "",
    isActive: true,
    isProOnboarding: false,
  });

  const [duration, setDuration] = useState<DurationInput>({
    hours: "",
    minutes: "",
    seconds: "",
  });

  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const getDurationInSeconds = useCallback((): number | null => {
    const hours = parseInt(duration.hours) || 0;
    const minutes = parseInt(duration.minutes) || 0;
    const seconds = parseInt(duration.seconds) || 0;

    if (hours === 0 && minutes === 0 && seconds === 0) {
      return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
  }, [duration]);

  const handleDurationChange = (field: keyof DurationInput, value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, "");

    // Validate ranges
    let validatedValue = numericValue;
    if (field === "hours" && parseInt(numericValue) > 99) {
      validatedValue = "99";
    } else if (
      (field === "minutes" || field === "seconds") &&
      parseInt(numericValue) > 59
    ) {
      validatedValue = "59";
    }

    setDuration((prev) => ({ ...prev, [field]: validatedValue }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only MP4, WebM, MOV, and AVI files are allowed");
      return;
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size exceeds 500MB limit");
      return;
    }

    setSelectedFile(file);

    // Try to get video duration automatically
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const totalSeconds = Math.round(video.duration);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setDuration({
        hours: hours > 0 ? hours.toString() : "",
        minutes: minutes.toString(),
        seconds: seconds.toString(),
      });
      toast.success("Video duration detected automatically");
    };
    video.src = URL.createObjectURL(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setDuration({ hours: "", minutes: "", seconds: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 90));
      }, 300);

      const res = await fetch("/api/trainingvideos/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { url } = await res.json();
      return url;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Please enter a video title");
      return;
    }

    if (uploadMode === "url" && !form.url.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    if (uploadMode === "file" && !selectedFile) {
      toast.error("Please select a video file");
      return;
    }

    const durationSec = getDurationInSeconds();
    if (!durationSec || durationSec <= 0) {
      toast.error("Please enter a valid video duration");
      return;
    }

    setSaving(true);

    try {
      let videoUrl = form.url;

      if (uploadMode === "file" && selectedFile) {
        const uploadedUrl = await uploadFile();
        if (!uploadedUrl) {
          throw new Error("Failed to upload video");
        }
        videoUrl = uploadedUrl;
      }

      const res = await fetch("/api/trainingvideos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          url: videoUrl,
          durationSec,
          isActive: form.isActive,
          isProOnboarding: form.isProOnboarding,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success("Training video created successfully!");
      router.push("/admin/dashboard/training-videos");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formattedDuration = () => {
    const h = parseInt(duration.hours) || 0;
    const m = parseInt(duration.minutes) || 0;
    const s = parseInt(duration.seconds) || 0;
    if (h === 0 && m === 0 && s === 0) return "Not set";
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(" ");
  };

  return (
    <motion.div
      className="space-y-6 max-w-3xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-black/10"
            >
              <Link href="/admin/dashboard/training-videos">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <CardTitle className="flex items-center text-2xl text-black">
                <Upload className="mr-3 h-6 w-6" />
                Upload Training Video
              </CardTitle>
              <p className="text-sm text-black/70 mt-1">
                Add a new training video for professionals
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="border-[#C4C4C4]/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileVideo className="h-5 w-5 text-[#F3CFC6]" />
              Video Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Video Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Professional Onboarding Guide 2025"
                className="border-[#C4C4C4]/50 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]"
              />
            </div>

            {/* Upload Mode Toggle */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Video Source</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={uploadMode === "file" ? "default" : "outline"}
                  onClick={() => setUploadMode("file")}
                  className={
                    uploadMode === "file"
                      ? "bg-[#F3CFC6] text-black hover:bg-[#e5b8ad] flex-1"
                      : "flex-1 border-[#C4C4C4]/50"
                  }
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <Button
                  type="button"
                  variant={uploadMode === "url" ? "default" : "outline"}
                  onClick={() => setUploadMode("url")}
                  className={
                    uploadMode === "url"
                      ? "bg-[#F3CFC6] text-black hover:bg-[#e5b8ad] flex-1"
                      : "flex-1 border-[#C4C4C4]/50"
                  }
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  External URL
                </Button>
              </div>
            </div>

            {/* File Upload */}
            {uploadMode === "file" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Video File <span className="text-red-500">*</span>
                </Label>
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                      dragOver
                        ? "border-[#F3CFC6] bg-[#F3CFC6]/10"
                        : "border-[#C4C4C4]/50 hover:border-[#F3CFC6] hover:bg-[#F3CFC6]/5"
                    }`}
                  >
                    <div className="h-16 w-16 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-8 w-8 text-[#F3CFC6]" />
                    </div>
                    <p className="font-medium text-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      MP4, WebM, MOV, AVI (max 500MB)
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-xl p-5 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-lg bg-[#F3CFC6]/20 flex items-center justify-center">
                          <Video className="h-7 w-7 text-[#F3CFC6]" />
                        </div>
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removeFile}
                        disabled={uploading}
                        className="rounded-full hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {uploading && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">
                            Uploading...
                          </span>
                          <span className="font-medium">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* URL Input */}
            {uploadMode === "url" && (
              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm font-medium">
                  Video URL <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="pl-10 border-[#C4C4C4]/50 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports YouTube, Vimeo, or direct MP4 links
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Duration */}
        <Card className="border-[#C4C4C4]/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#F3CFC6]" />
                Video Duration
                <span className="text-red-500">*</span>
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p>
                      Duration is required to track user progress and determine
                      when a video is considered &quot;completed&quot; (90%
                      watched).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
                Enter the exact duration of your video. This is used to
                calculate user progress and completion status.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="hours"
                  className="text-xs text-muted-foreground"
                >
                  Hours
                </Label>
                <Input
                  id="hours"
                  type="text"
                  inputMode="numeric"
                  value={duration.hours}
                  onChange={(e) =>
                    handleDurationChange("hours", e.target.value)
                  }
                  placeholder="0"
                  maxLength={2}
                  className="text-center text-lg font-mono border-[#C4C4C4]/50 focus:border-[#F3CFC6]"
                />
              </div>
              <span className="text-2xl font-light text-muted-foreground mt-6">
                :
              </span>
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="minutes"
                  className="text-xs text-muted-foreground"
                >
                  Minutes
                </Label>
                <Input
                  id="minutes"
                  type="text"
                  inputMode="numeric"
                  value={duration.minutes}
                  onChange={(e) =>
                    handleDurationChange("minutes", e.target.value)
                  }
                  placeholder="00"
                  maxLength={2}
                  className="text-center text-lg font-mono border-[#C4C4C4]/50 focus:border-[#F3CFC6]"
                />
              </div>
              <span className="text-2xl font-light text-muted-foreground mt-6">
                :
              </span>
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="seconds"
                  className="text-xs text-muted-foreground"
                >
                  Seconds
                </Label>
                <Input
                  id="seconds"
                  type="text"
                  inputMode="numeric"
                  value={duration.seconds}
                  onChange={(e) =>
                    handleDurationChange("seconds", e.target.value)
                  }
                  placeholder="00"
                  maxLength={2}
                  className="text-center text-lg font-mono border-[#C4C4C4]/50 focus:border-[#F3CFC6]"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg py-2">
              <Clock className="h-4 w-4" />
              <span>Total duration: </span>
              <span className="font-medium text-foreground">
                {formattedDuration()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="border-[#C4C4C4]/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Publish Status</Label>
                <p className="text-xs text-muted-foreground">
                  Published videos are visible to all professionals
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm ${!form.isActive ? "text-amber-600 font-medium" : "text-muted-foreground"}`}
                >
                  Draft
                </span>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isActive: checked })
                  }
                />
                <span
                  className={`text-sm ${form.isActive ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}
                >
                  Published
                </span>
              </div>
            </div>

            <div className="border-t border-[#C4C4C4]/20 pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    Professional Onboarding Video
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Mark as required for new professional onboarding
                  </p>
                </div>
                <Switch
                  checked={form.isProOnboarding}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isProOnboarding: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
            disabled={saving || uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black"
            disabled={saving || uploading}
          >
            {uploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-pulse" />
                Uploading...
              </>
            ) : saving ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Create Video
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
