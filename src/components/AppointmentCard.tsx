// components/AppointmentCard.tsx
import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, MessageSquare } from "lucide-react";

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
      className="p-4 border border-[#F3CFC6] rounded-lg shadow-sm bg-white dark:bg-gray-800 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-all"
      variants={cardVariants}
    >
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-semibold text-black dark:text-white">
          {specialistName}
        </h3>
        <div className="flex items-center space-x-2 text-sm text-[#C4C4C4]">
          <Calendar className="h-4 w-4 text-[#F3CFC6]" />
          <span>{date}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-[#C4C4C4]">
          <Clock className="h-4 w-4 text-[#F3CFC6]" />
          <span>{time}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-[#C4C4C4]">
          <MapPin className="h-4 w-4 text-[#F3CFC6]" />
          <span>{location}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-yellow-500">
            {"★".repeat(Math.round(rating))}
          </span>
          <span className="text-[#C4C4C4]">({reviewCount} reviews)</span>
        </div>
        <div className="text-sm text-[#C4C4C4]">
          <span>${rate}/session</span>
        </div>
        <div className="text-sm text-[#C4C4C4]">
          <span>
            Status: {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <Button
          variant="outline"
          className="mt-2 text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20 rounded-full"
          onClick={onMessage}
        >
          <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" />
          Message
        </Button>
      </div>
    </motion.div>
  );
};

export default AppointmentCard;
