"use client";

import React from "react";
import { MessageCircle, Star, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProfessionalCardProps {
  name: string;
  imageSrc: string;
  location: string;
  rating: number;
  reviewCount: number;
  rate: number;
  onMessage?: () => void;
  className?: string;
}

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({
  name,
  imageSrc,
  location,
  rating,
  reviewCount,
  rate,
  onMessage,
  className,
}) => {
  return (
    <Card className={`shadow-lg border-[#F3CFC6] ${className}`}>
      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
        <Avatar className="h-20 w-20 border-2 border-white">
          <AvatarImage
            src={imageSrc}
            alt={name}
            className="rounded-full object-cover"
          />
          <AvatarFallback className="rounded-full bg-[#C4C4C4] text-black">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-black dark:text-white">
            {name}
          </h3>
          {location && (
            <div className="flex items-center text-xs text-[#C4C4C4] mt-0.5">
              <MapPin className="h-4 w-4 text-[#F3CFC6] mr-1" />
              {location}
            </div>
          )}
          <div className="text-sm text-[#C4C4C4] mt-0.5">${rate}/hr</div>
          <div className="flex items-center justify-center text-xs text-[#C4C4C4] mt-0.5">
            <Star className="h-4 w-4 text-[#F3CFC6] mr-1" />
            {rating.toFixed(1)} ({reviewCount} reviews)
          </div>
        </div>
      </CardContent>
      {onMessage && (
        <CardFooter className="p-2 pt-0">
          <Button
            onClick={onMessage}
            size="sm"
            className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white text-xs px-3 py-1 w-full rounded-full"
          >
            <MessageCircle className="w-4 h-4 mr-1 text-black dark:text-white" />
            Message
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ProfessionalCard;
