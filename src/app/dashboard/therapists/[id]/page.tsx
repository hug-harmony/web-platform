"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Star, BookOpen, FileText } from "lucide-react";
import { notFound } from "next/navigation";

// Dummy data for the therapist profile
const dummySpecialist = {
  _id: "1",
  userId: "u1",
  name: "Alex Smith",
  role: "Licensed Therapist",
  tags: "Anxiety, Depression, CBT, Mindfulness",
  biography:
    "Alex Smith is a compassionate therapist with over 10 years of experience helping clients navigate mental health challenges. Specializing in CBT and mindfulness, Alex creates personalized plans to foster emotional well-being.",
  education: "M.S. Clinical Psychology, University of New York",
  license: "NY-LPC-123456",
  imageSrc: "/register.jpg",
  location: "New York, NY",
  rating: 4.8,
  reviewCount: 120,
  rate: 50,
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface Props {
  params: { id: string };
}

const ProfilePage: React.FC<Props> = ({ params }) => {
  // Simulate not found for invalid ID
  if (!params.id || params.id !== dummySpecialist._id) {
    return notFound();
  }

  const specialist = dummySpecialist;
  const validImageSrc = specialist.imageSrc || "/register.jpg";
  const tagsArray = specialist.tags
    ? specialist.tags.split(",").map((tag) => tag.trim())
    : [];

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-start justify-center p-4 sm:p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden"
        variants={itemVariants}
      >
        {/* Header Section with Blurred Background */}
        <div className="relative h-64 sm:h-80">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${validImageSrc})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(8px)",
            }}
          />
          <div className="absolute inset-0 bg-opacity-30" />
          <div className="relative flex justify-center items-center h-full">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white shadow-md z-10">
              <Image
                src={validImageSrc}
                alt={specialist.name}
                width={160}
                height={160}
                className="object-cover w-full h-full"
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 sm:p-8 text-center">
          {/* Name & Role */}
          <motion.h2
            className="text-2xl sm:text-3xl font-bold text-gray-800"
            variants={itemVariants}
          >
            {specialist.name}, {specialist.role}
          </motion.h2>
          <motion.div
            className="flex items-center justify-center gap-2 mt-2 text-gray-600"
            variants={itemVariants}
          >
            <MapPin className="h-4 w-4" />
            <span>{specialist.location}</span>
            <Star className="h-4 w-4 ml-4 text-yellow-400" />
            <span>
              {specialist.rating} ({specialist.reviewCount} reviews)
            </span>
          </motion.div>

          {/* Tags */}
          <motion.div
            className="flex flex-wrap justify-center gap-2 mt-4"
            variants={itemVariants}
          >
            {tagsArray.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="bg-[#C6A89D] text-white text-xs px-3 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
            {tagsArray.length > 4 && (
              <span className="bg-[#C6A89D] text-white text-xs px-3 py-1 rounded-full">
                +{tagsArray.length - 4} more
              </span>
            )}
          </motion.div>

          {/* Biography */}
          <motion.div
            className="mt-6 max-w-2xl mx-auto text-gray-700"
            variants={itemVariants}
          >
            <h3 className="text-lg font-semibold mb-2">Biography</h3>
            <p className="text-sm sm:text-base">{specialist.biography}</p>
          </motion.div>

          {/* Education & License */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6"
            variants={itemVariants}
          >
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm text-left">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-gray-600" />
                <h4 className="font-semibold text-sm sm:text-base">
                  Education
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {specialist.education}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm text-left">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <h4 className="font-semibold text-sm sm:text-base">
                  License Number
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {specialist.license}
              </p>
            </div>
          </motion.div>

          {/* Rate & Booking */}
          <motion.div className="mt-6" variants={itemVariants}>
            <p className="text-lg font-semibold text-gray-800">
              ${specialist.rate}/session
            </p>
            <Link href="/dashboard/therapists/booking" passHref>
              <Button className="mt-4 bg-[#E8C5BC] hover:bg-[#D9B1A4] text-black px-6 py-2 rounded-full">
                Book a Session with {specialist.name}
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfilePage;
