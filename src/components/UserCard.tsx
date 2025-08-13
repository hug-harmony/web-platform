"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface UserCardProps {
  name: string;
  imageSrc: string;
  onMessage?: () => void;
  className?: string;
}

const UserCard: React.FC<UserCardProps> = ({
  name,
  imageSrc,
  onMessage,
  className,
}) => {
  return (
    <Card className={`shadow-lg border-[#F3CFC6] ${className}`}>
      <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
        <Avatar className="h-20 w-20 border-2 border-white">
          <AvatarImage src={imageSrc} alt={name} className="rounded-full" />
          <AvatarFallback className="rounded-full bg-[#C4C4C4] text-black">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center justify-center grow w-full">
          <h3 className="text-lg font-semibold text-black dark:text-white">
            {name}
          </h3>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;
