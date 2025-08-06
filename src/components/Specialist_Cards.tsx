"use client";

import React from "react";
import { ChevronRight, MessageCircle, Phone, Star, MapPin } from "lucide-react";
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
  onCall?: () => void;
}

const SpecialistCard: React.FC<SpecialistCardProps> = ({
  name,
  imageSrc,
  location,
  rating,
  reviewCount,
  rate,
  onMessage,
  onCall,
}) => {
  return (
    <Card className="bg-white border border-pink-200 shadow-md ">
      <CardContent className="p-1.5 flex items-center space-x-3">
        <Avatar className="h-10 w-10">
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
          <div className="text-xs text-gray-500 mt-0.5">${rate}/hr</div>
          <div className="flex items-center text-xs text-gray-500 mt-0.5">
            <Star className="h-3 w-3 text-yellow-400 mr-1" />
            {rating.toFixed(1)} ({reviewCount} reviews)
          </div>
        </div>
      </CardContent>
      {(onMessage || onCall) && (
        <CardFooter className="p-1.5 pt-0 flex space-x-1.5">
          {onMessage && (
            <Button
              onClick={onMessage}
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1" />
              Msg
            </Button>
          )}
          {onCall && (
            <Button
              onClick={onCall}
              size="sm"
              className="bg-green-500 hover:bg-blue-600 text-white text-xs px-2 py-1"
            >
              <Phone className="w-3.5 h-3.5 mr-1" />
              Call
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default SpecialistCard;
