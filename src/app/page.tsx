"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";

const Home = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      {/* Logo */}
      <Image
        src="/hug.png"
        alt="Hug Harmony Logo"
        width={128}
        height={128}
        className="mt-4 rounded-full object-cover"
        priority
      />

      {/* Title */}
      <h1 className="mt-6 text-2xl font-bold text-center">Hug Harmony</h1>

      {/* Subtitle */}
      <p className="mt-2 text-sm text-center text-gray-600 max-w-sm">
        Short details for the users and their information. You can add more text
        here to explain your app or its features.
      </p>

      {/* Button */}
      <Button
        onClick={() => router.push("/register")}
        className="mt-12 bg-[#E7C4BB] text-white px-6 py-3 rounded shadow-md hover:bg-[#d9b3a9] transition"
      >
        Start
      </Button>
    </div>
  );
};

export default Home;
