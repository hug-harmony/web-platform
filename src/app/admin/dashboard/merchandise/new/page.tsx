"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, ArrowLeft, Upload, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import Image from "next/image";

export default function NewMerchPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setPreview("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      toast.error("Please upload an image");
      return;
    }

    setUploading(true);
    const uploadForm = new FormData();
    uploadForm.append("file", image);

    const uploadRes = await fetch("/api/merchandise/upload", {
      method: "POST",
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      toast.error("Image upload failed");
      setUploading(false);
      return;
    }

    const { url } = await uploadRes.json();

    const res = await fetch("/api/merchandise", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        image: url,
        price: +form.price,
        stock: +form.stock,
      }),
      headers: { "Content-Type": "application/json" },
    });

    setUploading(false);

    if (res.ok) {
      toast.success("Created");
      router.push("/admin/dashboard/merchandise");
    } else {
      toast.error("Failed to create item");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/dashboard/merchandise">
              <ArrowLeft />
            </Link>
          </Button>
          <CardTitle className="flex items-center text-2xl font-bold">
            <Package className="mr-2 h-6 w-6" />
            Add Item
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-6">
            <div>
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Description</Label>
              <RichTextEditor
                value={form.description}
                onChange={(html) => setForm({ ...form, description: html })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  required
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Image (max 2MB)</Label>
              <div className="space-y-3">
                {!preview ? (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Upload className="h-10 w-10 text-[#C4C4C4]" />
                    <p className="mt-2 text-sm text-[#C4C4C4]">
                      Click to upload
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <Image
                      src={preview}
                      alt="Preview"
                      width={800}
                      height={400}
                      unoptimized
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                uploading || !image || !form.name || !form.price || !form.stock
              }
            >
              {uploading ? "Uploading & Creating..." : "Create Item"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
