"use client";

import React from "react";
import { MessageCircle, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UserCardProps {
  name: string;
  imageSrc: string;
  location: string;
  rating: number;
  reviewCount: number;
  rate: number;
  onMessage?: () => void;
}

const UserCard: React.FC<UserCardProps> = ({
  name,
  imageSrc,
  location,

  onMessage,
}) => {
  return (
    <Card className="bg-white border border-pink-200 shadow-md">
      <CardContent className="px-4 py-2 flex items-center gap-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={imageSrc} alt={name} className="rounded-full" />
          <AvatarFallback className="rounded-full">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex grow w-full">
          <h3 className="text-lg font-semibold">{name}</h3>
          {location && (
            <div className="flex items-center text-xs text-gray-500 mt-0.5">
              <MapPin className="h-3 w-3 mr-1" />
              {location}
            </div>
          )}

          <div className="flex items-center text-xs text-gray-500 mt-0.5"></div>
        </div>
      </CardContent>
      {onMessage && (
        <CardFooter className="p-1.5 pt-0">
          <Button
            onClick={onMessage}
            size="sm"
            className="bg-[#E8C5BC] hover:bg-[#ddb0a3] text-black text-xs px-2 py-1 w-full"
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1" />
            Msg
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default UserCard;
