"use client";

import React from "react";
import { MessageCircle, Star, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SpecialistCardProps {
  name: string;
  imageSrc: string;
  location: string;
  rating: number;
  reviewCount: number;
  rate: number;
  onMessage?: () => void;
}

const SpecialistCard: React.FC<SpecialistCardProps> = ({
  name,
  imageSrc,
  location,
  rating,
  reviewCount,
  rate,
  onMessage,
}) => {
  return (
    <Card className="bg-white border border-pink-200 shadow-md">
      <CardContent className="p-2 flex flex-col items-center text-center gap-2">
        <Avatar className="h-20 w-20">
          <AvatarImage src={imageSrc} alt={name} className="rounded-full" />
          <AvatarFallback className="rounded-full">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{name}</h3>
          {location && (
            <div className="flex items-center text-xs text-gray-500 mt-0.5">
              <MapPin className="h-3 w-3 mr-1" />
              {location}
            </div>
          )}
          <div className="text-md text-gray-500 mt-0.5">${rate}/hr</div>
          <div className="flex items-center justify-center text-xs text-gray-500 mt-0.5">
            <Star className="h-3 w-3 text-yellow-400 mr-1" />
            {rating.toFixed(1)} ({reviewCount} reviews)
          </div>
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

export default SpecialistCard;
