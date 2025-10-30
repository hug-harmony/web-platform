/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import Image from "next/image";

export default function ProductPage() {
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    fetch(`/api/merchandise/${id}`)
      .then((r) => r.json())
      .then(setItem);
  }, [id]);

  if (!item) return <p className="text-center">Loading...</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/merchandise">
              <ArrowLeft />
            </Link>
          </Button>
          <CardTitle className="flex items-center text-2xl font-bold">
            <Package className="mr-2 h-6 w-6" />
            {item.name}
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
          <Image
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover"
            width={500}
            height={500}
          />
        </div>
        <Card>
          <CardContent className="space-y-4 p-6">
            <h1 className="text-3xl font-bold">{item.name}</h1>
            <p className="text-2xl font-bold text-[#F3CFC6]">${item.price}</p>
            <p className="text-sm text-[#C4C4C4]">In stock: {item.stock}</p>
            <p>{item.description || "No description available."}</p>
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                addToCart(item);
                toast.success("Added!");
              }}
              disabled={item.stock === 0}
            >
              {item.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
