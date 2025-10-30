"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, ArrowLeft, Upload, X, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import Image from "next/image";

export default function EditMerchPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    stock: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/merchandise/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setForm({
          name: data.name,
          description: data.description || "",
          price: data.price.toString(),
          image: data.image || "",
          stock: data.stock.toString(),
        });
        setPreview(data.image || "");
      })
      .catch(() => toast.error("Failed to load item"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Max 2MB");
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setPreview(form.image);
  };

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    let imageUrl = form.image;

    if (image) {
      const uploadForm = new FormData();
      uploadForm.append("file", image);

      const res = await fetch("/api/merchandise/upload", {
        method: "POST",
        body: uploadForm,
      });

      if (!res.ok) {
        toast.error("Upload failed");
        setUploading(false);
        return;
      }

      const data = await res.json();
      imageUrl = data.url;
    }

    const res = await fetch(`/api/merchandise/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...form,
        image: imageUrl,
        price: +form.price,
        stock: +form.stock,
      }),
      headers: { "Content-Type": "application/json" },
    });

    setUploading(false);

    if (res.ok) {
      toast.success("Updated");
      router.push("/admin/dashboard/merchandise");
    } else {
      toast.error("Failed to update");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this item permanently?")) return;

    const res = await fetch(`/api/merchandise/${id}`, { method: "DELETE" });

    if (res.ok) {
      toast.success("Deleted");
      router.push("/admin/dashboard/merchandise");
    } else {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <p className="text-center">Loading...</p>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href="/admin/dashboard/merchandise">
                <ArrowLeft />
              </Link>
            </Button>
            <CardTitle className="flex items-center text-2xl font-bold">
              <Package className="mr-2 h-6 w-6" />
              Edit Item
            </CardTitle>
          </div>
          <Button variant="destructive" size="icon" onClick={remove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={update} className="space-y-6">
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
                {preview ? (
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
                ) : (
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
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={uploading}>
              {uploading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
