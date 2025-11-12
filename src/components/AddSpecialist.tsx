"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Upload } from "lucide-react";
import Image from "next/image";

interface ProfessionalFormData {
  name: string;
  image?: string;
  location?: string;
  rating?: string;
  reviewCount?: string;
  rate?: string;
  role?: string;
  tags?: string;
  biography?: string;
  education?: string;
  license?: string;
}

interface AddProfessionalProps {
  onProfessionalAdded?: () => void; // Callback to refresh professionals list
}

export default function AddProfessional({
  onProfessionalAdded,
}: AddProfessionalProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ProfessionalFormData>({
    name: "",
    image: "",
    location: "",
    rating: "",
    reviewCount: "",
    rate: "",
    role: "",
    tags: "",
    biography: "",
    education: "",
    license: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setFormError("Only image files are allowed");
        return;
      }
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setFormError("File size exceeds 5MB limit");
        return;
      }
      setImageFile(file);
      setFormError(null);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile) return null;
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      const response = await fetch("/api/users/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }
      const { url } = await response.json();
      return url;
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Image upload failed"
      );
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const requiredFields = [
      "name",
      "role",
      "tags",
      "biography",
      "education",
      "license",
    ];
    const missingFields = requiredFields.filter(
      (field) => !formData[field as keyof ProfessionalFormData]
    );
    if (missingFields.length > 0) {
      setFormError(`Missing required fields: ${missingFields.join(", ")}`);
      setIsSubmitting(false);
      return;
    }

    try {
      let imageUrl = formData.image;
      if (imageFile) {
        const uploadedUrl = await handleImageUpload();
        if (!uploadedUrl) {
          setIsSubmitting(false);
          return;
        }
        imageUrl = uploadedUrl;
      }

      const response = await fetch("/api/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          image: imageUrl,
          rating: formData.rating ? parseFloat(formData.rating) : undefined,
          reviewCount: formData.reviewCount
            ? parseInt(formData.reviewCount)
            : undefined,
          rate: formData.rate ? parseFloat(formData.rate) : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add professional");
      }

      setFormData({
        name: "",
        image: "",
        location: "",
        rating: "",
        reviewCount: "",
        rate: "",
        role: "",
        tags: "",
        biography: "",
        education: "",
        license: "",
      });
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsDialogOpen(false);
      if (onProfessionalAdded) onProfessionalAdded();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "An error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open && imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <PlusCircle className="h-5 w-5" />
          <span>Add a Professional Profile for Testing</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Professional</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Personal and Professional Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  placeholder="Enter role"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags *</Label>
                <Input
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="Enter tags (comma-separated)"
                  required
                />
              </div>
              <div>
                <Label htmlFor="biography">Biography *</Label>
                <Textarea
                  id="biography"
                  name="biography"
                  value={formData.biography}
                  onChange={handleInputChange}
                  placeholder="Enter biography"
                  required
                  className="min-h-[100px]"
                />
              </div>
            </div>
            {/* Right Column: Additional Details and Image */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="image">Profile Image</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="h-5 w-5" />
                    <span>{imageFile ? "Change Image" : "Upload Image"}</span>
                  </Button>
                  {imagePreview && (
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      className="h-12 w-12 object-cover rounded"
                      width={900}
                      height={900}
                    />
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter location"
                />
              </div>
              <div>
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  name="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rating}
                  onChange={handleInputChange}
                  placeholder="Enter rating (0-5)"
                />
              </div>
              <div>
                <Label htmlFor="reviewCount">Review Count</Label>
                <Input
                  id="reviewCount"
                  name="reviewCount"
                  type="number"
                  min="0"
                  value={formData.reviewCount}
                  onChange={handleInputChange}
                  placeholder="Enter review count"
                />
              </div>
              <div>
                <Label htmlFor="rate">Rate</Label>
                <Input
                  id="rate"
                  name="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.rate}
                  onChange={handleInputChange}
                  placeholder="Enter rate"
                />
              </div>
              <div>
                <Label htmlFor="education">Education *</Label>
                <Input
                  id="education"
                  name="education"
                  value={formData.education}
                  onChange={handleInputChange}
                  placeholder="Enter education"
                  required
                />
              </div>
              <div>
                <Label htmlFor="license">License *</Label>
                <Input
                  id="license"
                  name="license"
                  value={formData.license}
                  onChange={handleInputChange}
                  placeholder="Enter license"
                  required
                />
              </div>
            </div>
          </div>
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Add Professional"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
