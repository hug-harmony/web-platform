/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface Therapist {
  _id: string;
  name: string;
  image?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  rate?: number;
  role?: string;
  tags?: string;
  biography?: string;
  education?: string;
  license?: string;
  createdAt?: string;
}

interface AddTherapistDialogProps {
  onAddTherapist: (therapist: Therapist) => void;
}

export default function AddTherapistDialog({
  onAddTherapist,
}: AddTherapistDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    location: "",
    rating: "0",
    reviewCount: "0",
    rate: "0",
    role: "",
    tags: "",
    biography: "",
    education: "",
    license: "",
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => prev.filter((error) => !error.includes(name)));
  };

  const validateForm = () => {
    const errors: string[] = [];
    const requiredFields = [
      "name",
      "role",
      "tags",
      "biography",
      "education",
      "license",
    ];
    requiredFields.forEach((field) => {
      if (!formData[field as keyof typeof formData]) {
        errors.push(`${field} is required`);
      }
    });
    if (
      formData.rating &&
      (parseFloat(formData.rating) < 0 || parseFloat(formData.rating) > 5)
    ) {
      errors.push("Rating must be between 0 and 5");
    }
    if (formData.reviewCount && parseInt(formData.reviewCount) < 0) {
      errors.push("Review count cannot be negative");
    }
    if (formData.rate && parseFloat(formData.rate) < 0) {
      errors.push("Rate cannot be negative");
    }
    return errors;
  };

  const handleAddTherapist = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const newTherapist = {
        name: formData.name,
        image: formData.image,
        location: formData.location,
        rating: parseFloat(formData.rating) || 0,
        reviewCount: parseInt(formData.reviewCount) || 0,
        rate: parseFloat(formData.rate) || 0,
        role: formData.role,
        tags: formData.tags,
        biography: formData.biography,
        education: formData.education,
        license: formData.license,
      };

      const res = await fetch("/api/specialists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTherapist),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Failed to create therapist: ${res.status}`);
      }

      const createdTherapist = await res.json();
      onAddTherapist({
        _id: createdTherapist.id,
        name: createdTherapist.name,
        image: createdTherapist.image || "",
        location: createdTherapist.location || "",
        rating: createdTherapist.rating || 0,
        reviewCount: createdTherapist.reviewCount || 0,
        rate: createdTherapist.rate || 0,
        role: createdTherapist.role || "",
        tags: createdTherapist.tags || "",
        biography: createdTherapist.biography || "",
        education: createdTherapist.education || "",
        license: createdTherapist.license || "",
        createdAt: createdTherapist.createdAt,
      });
      setOpen(false);
      setFormData({
        name: "",
        image: "",
        location: "",
        rating: "0",
        reviewCount: "0",
        rate: "0",
        role: "",
        tags: "",
        biography: "",
        education: "",
        license: "",
      });
      setFormErrors([]);
    } catch (error) {
      console.error("Error creating therapist:", error);
      setFormErrors(["Failed to add therapist. Please try again."]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Add Therapist</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-6">
        <DialogHeader>
          <DialogTitle>Add New Therapist</DialogTitle>
        </DialogHeader>
        {formErrors.length > 0 && (
          <div className="text-red-500 text-sm mb-4">
            {formErrors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label htmlFor="name" className="text-sm font-medium mb-1">
              Name *
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              className="h-9"
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="image" className="text-sm font-medium mb-1">
              Image URL
            </label>
            <Input
              id="image"
              name="image"
              value={formData.image}
              onChange={handleFormChange}
              className="h-9"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="location" className="text-sm font-medium mb-1">
              Location
            </label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleFormChange}
              className="h-9"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="rating" className="text-sm font-medium mb-1">
              Rating (0-5)
            </label>
            <Input
              id="rating"
              name="rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={formData.rating}
              onChange={handleFormChange}
              className="h-9"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="reviewCount" className="text-sm font-medium mb-1">
              Review Count
            </label>
            <Input
              id="reviewCount"
              name="reviewCount"
              type="number"
              min="0"
              value={formData.reviewCount}
              onChange={handleFormChange}
              className="h-9"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="rate" className="text-sm font-medium mb-1">
              Rate
            </label>
            <Input
              id="rate"
              name="rate"
              type="number"
              step="0.01"
              min="0"
              value={formData.rate}
              onChange={handleFormChange}
              className="h-9"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="role" className="text-sm font-medium mb-1">
              Role *
            </label>
            <Input
              id="role"
              name="role"
              value={formData.role}
              onChange={handleFormChange}
              className="h-9"
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="tags" className="text-sm font-medium mb-1">
              Tags *
            </label>
            <Input
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleFormChange}
              className="h-9"
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="biography" className="text-sm font-medium mb-1">
              Biography *
            </label>
            <textarea
              id="biography"
              name="biography"
              value={formData.biography}
              onChange={handleFormChange}
              className="border rounded p-2 h-16 resize-none"
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="education" className="text-sm font-medium mb-1">
              Education *
            </label>
            <Input
              id="education"
              name="education"
              value={formData.education}
              onChange={handleFormChange}
              className="h-9"
              required
            />
          </div>
          <div className="flex flex-col col-span-2">
            <label htmlFor="license" className="text-sm font-medium mb-1">
              License *
            </label>
            <Input
              id="license"
              name="license"
              value={formData.license}
              onChange={handleFormChange}
              className="h-9"
              required
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddTherapist}>Add Therapist</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
