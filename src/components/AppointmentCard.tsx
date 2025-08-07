// components/AppointmentCard.tsx
import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock } from "lucide-react";

interface AppointmentCardProps {
  specialistName: string;
  date: string;
  time: string;
  location: string;
  rating: number;
  reviewCount: number;
  rate: number;
  status: "upcoming" | "completed" | "cancelled";
  onMessage: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  specialistName,
  date,
  time,
  location,
  rating,
  reviewCount,
  rate,
  status,
  onMessage,
}) => {
  return (
    <motion.div
      className="p-4 border rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow"
      variants={cardVariants}
    >
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-semibold">{specialistName}</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{date}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>{time}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>{location}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-yellow-500">
            {"★".repeat(Math.round(rating))}
          </span>
          <span>({reviewCount} reviews)</span>
        </div>
        <div className="text-sm text-gray-600">
          <span>${rate}/session</span>
        </div>
        <div className="text-sm text-gray-600">
          <span>
            Status: {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <Button variant="outline" className="mt-2" onClick={onMessage}>
          Message
        </Button>
      </div>
    </motion.div>
  );
};

export default AppointmentCard;
