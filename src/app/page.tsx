"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

import icon from "../../public/hh-icon.png";
import { useRouter } from "next/navigation";

const LandingPage = () => {
  const router = useRouter();

  const handleStart = () => {
    router.push("/register");
  };

  return (
    <div className="h-screen max-w-3xl mx-auto flex flex-col items-center justify-center gap-4 text-center">
      <div className="bg-white flex items-center justify-center p-8 rounded-full shadow-md">
        <Image
          src={icon}
          width={300}
          height={300}
          alt="hug harmony icon"
          className="h-30 w-30 object-contain"
        />
      </div>
      <h1 className="text-4xl font-bold">Hug Harmony</h1>
      <p>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Assumenda in
        aperiam quaerat. Repellat quis omnis natus laboriosam, deserunt maiores
        alias accusantium eligendi minus quaerat repellendus est, quod sed odio
        eum.
      </p>
      <Button onClick={handleStart} className="w-2/5 cursor-pointer">
        Start
      </Button>
    </div>
  );
};

export default LandingPage;
