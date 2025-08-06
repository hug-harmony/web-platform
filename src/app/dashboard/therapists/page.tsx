/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SpecialistCard from "@/components/Specialist_Cards";
import { DialogHeader } from "@/components/ui/dialog";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@radix-ui/react-dialog";

interface Therapist {
  _id: string;
  name: string;
  image?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  rate?: number;
  role?: string;
  tags?: string;
  biography?: string;
  education?: string;
  license?: string;
  createdAt?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function TherapistsPage() {
  const [users, setUsers] = useState<Therapist[]>([]);
  const [specialists, setSpecialists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    minRating: 0,
    sortBy: "",
  });
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    location: "",
    rating: "0",
    reviewCount: "0",
    rate: "0",
    role: "",
    tags: "",
    biography: "",
    education: "",
    license: "",
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersRes = await fetch("/api/users", {
          cache: "no-store",
          credentials: "include",
        });
        if (!usersRes.ok) {
          if (usersRes.status === 401) redirect("/login");
          throw new Error(`Failed to fetch users: ${usersRes.status}`);
        }
        const usersData = await usersRes.json();
        setUsers(
          Array.isArray(usersData)
            ? usersData.map((user) => ({
                _id: user.id,
                name: `${user.firstName} ${user.lastName}`,
                image: user.imageSrc || "",
                location: user.location || "",
                rating: user.rating || 0,
                reviewCount: user.reviewCount || 0,
                rate: user.rate || 0,
                createdAt: user.createdAt,
              }))
            : [
                {
                  _id: usersData.id,
                  name: `${usersData.firstName} ${usersData.lastName}`,
                  image: usersData.imageSrc || "",
                  location: usersData.location || "",
                  rating: usersData.rating || 0,
                  reviewCount: usersData.reviewCount || 0,
                  rate: usersData.rate || 0,
                  createdAt: usersData.createdAt,
                },
              ]
        );

        const therapistsRes = await fetch("/api/specialists", {
          cache: "no-store",
          credentials: "include",
        });
        if (!therapistsRes.ok) {
          if (therapistsRes.status === 401) redirect("/login");
          throw new Error(
            `Failed to fetch therapists: ${therapistsRes.status}`
          );
        }
        const { specialists } = await therapistsRes.json();
        setSpecialists(
          specialists.map((s: any) => ({
            _id: s.id,
            name: s.name,
            image: s.image || "",
            location: s.location || "",
            rating: s.rating || 0,
            reviewCount: s.reviewCount || 0,
            rate: s.rate || 0,
            role: s.role || "",
            tags: s.tags || "",
            biography: s.biography || "",
            education: s.education || "",
            license: s.license || "",
            createdAt: s.createdAt,
          }))
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => prev.filter((error) => !error.includes(name)));
  };

  const validateForm = () => {
    const errors: string[] = [];
    const requiredFields = [
      "name",
      "role",
      "tags",
      "biography",
      "education",
      "license",
    ];
    requiredFields.forEach((field) => {
      if (!formData[field as keyof typeof formData]) {
        errors.push(`${field} is required`);
      }
    });
    if (
      formData.rating &&
      (parseFloat(formData.rating) < 0 || parseFloat(formData.rating) > 5)
    ) {
      errors.push("Rating must be between 0 and 5");
    }
    if (formData.reviewCount && parseInt(formData.reviewCount) < 0) {
      errors.push("Review count cannot be negative");
    }
    if (formData.rate && parseFloat(formData.rate) < 0) {
      errors.push("Rate cannot be negative");
    }
    return errors;
  };

  const handleAddTherapist = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const newTherapist = {
        name: formData.name,
        image: formData.image,
        location: formData.location,
        rating: parseFloat(formData.rating) || 0,
        reviewCount: parseInt(formData.reviewCount) || 0,
        rate: parseFloat(formData.rate) || 0,
        role: formData.role,
        tags: formData.tags,
        biography: formData.biography,
        education: formData.education,
        license: formData.license,
      };

      const res = await fetch("/api/specialists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTherapist),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Failed to create therapist: ${res.status}`);
      }

      const createdTherapist = await res.json();
      setSpecialists((prev) => [
        ...prev,
        {
          _id: createdTherapist.id,
          name: createdTherapist.name,
          image: createdTherapist.image || "",
          location: createdTherapist.location || "",
          rating: createdTherapist.rating || 0,
          reviewCount: createdTherapist.reviewCount || 0,
          rate: createdTherapist.rate || 0,
          role: createdTherapist.role || "",
          tags: createdTherapist.tags || "",
          biography: createdTherapist.biography || "",
          education: createdTherapist.education || "",
          license: createdTherapist.license || "",
          createdAt: createdTherapist.createdAt,
        },
      ]);
      setOpen(false);
      setFormData({
        name: "",
        image: "",
        location: "",
        rating: "0",
        reviewCount: "0",
        rate: "0",
        role: "",
        tags: "",
        biography: "",
        education: "",
        license: "",
      });
      setFormErrors([]);
    } catch (error) {
      console.error("Error creating therapist:", error);
      setFormErrors(["Failed to add therapist. Please try again."]);
    }
  };

  const locations = Array.from(
    new Set(specialists.map((t) => t.location).filter(Boolean))
  ) as string[];

  const filterAndSort = (data: Therapist[]) =>
    data
      .filter((item) =>
        searchQuery
          ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
      .filter((item) =>
        filters.location ? item.location === filters.location : true
      )
      .filter((item) =>
        filters.minRating ? (item.rating || 0) >= filters.minRating : true
      )
      .sort((a, b) => {
        if (filters.sortBy === "rating") {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (filters.sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });

  const filteredUsers = filterAndSort(users);
  const filteredSpecialists = filterAndSort(specialists);

  const ratings = [4.5, 4.0, 3.5, 3.0];
  const sortOptions = ["rating", "name"];

  return (
    <motion.div
      className="flex min-h-screen items-start p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="w-full max-w-6xl">
        <div className="flex items-center mb-6 w-full space-x-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="p-2 pl-10 rounded border border-gray-300 w-full"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Location</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Location</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleFilterChange("location", "")}
              >
                All
              </DropdownMenuItem>
              {locations.map((location) => (
                <DropdownMenuItem
                  key={location}
                  onClick={() => handleFilterChange("location", location)}
                >
                  {location}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Star className="h-5 w-5" />
                <span>Rating</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Minimum Rating</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleFilterChange("minRating", 0)}
              >
                All
              </DropdownMenuItem>
              {ratings.map((rating) => (
                <DropdownMenuItem
                  key={rating}
                  onClick={() => handleFilterChange("minRating", rating)}
                >
                  {rating}+
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <span>Sort By</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleFilterChange("sortBy", "")}
              >
                None
              </DropdownMenuItem>
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => handleFilterChange("sortBy", option)}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Add Therapist</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-6">
              <DialogHeader>
                <DialogTitle>Add New Therapist</DialogTitle>
              </DialogHeader>
              {formErrors.length > 0 && (
                <div className="text-red-500 text-sm mb-4">
                  {formErrors.map((error, index) => (
                    <p key={index}>{error}</p>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label htmlFor="name" className="text-sm font-medium mb-1">
                    Name *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className="h-9"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="image" className="text-sm font-medium mb-1">
                    Image URL
                  </label>
                  <Input
                    id="image"
                    name="image"
                    value={formData.image}
                    onChange={handleFormChange}
                    className="h-9"
                  />
                </div>
                <div className="flex flex-col">
                  <label
                    htmlFor="location"
                    className="text-sm font-medium mb-1"
                  >
                    Location
                  </label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    className="h-9"
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="rating" className="text-sm font-medium mb-1">
                    Rating (0-5)
                  </label>
                  <Input
                    id="rating"
                    name="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={handleFormChange}
                    className="h-9"
                  />
                </div>
                <div className="flex flex-col">
                  <label
                    htmlFor="reviewCount"
                    className="text-sm font-medium mb-1"
                  >
                    Review Count
                  </label>
                  <Input
                    id="reviewCount"
                    name="reviewCount"
                    type="number"
                    min="0"
                    value={formData.reviewCount}
                    onChange={handleFormChange}
                    className="h-9"
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="rate" className="text-sm font-medium mb-1">
                    Rate
                  </label>
                  <Input
                    id="rate"
                    name="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.rate}
                    onChange={handleFormChange}
                    className="h-9"
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="role" className="text-sm font-medium mb-1">
                    Role *
                  </label>
                  <Input
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    className="h-9"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="tags" className="text-sm font-medium mb-1">
                    Tags *
                  </label>
                  <Input
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleFormChange}
                    className="h-9"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label
                    htmlFor="biography"
                    className="text-sm font-medium mb-1"
                  >
                    Biography *
                  </label>
                  <textarea
                    id="biography"
                    name="biography"
                    value={formData.biography}
                    onChange={handleFormChange}
                    className="border rounded p-2 h-16 resize-none"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label
                    htmlFor="education"
                    className="text-sm font-medium mb-1"
                  >
                    Education *
                  </label>
                  <Input
                    id="education"
                    name="education"
                    value={formData.education}
                    onChange={handleFormChange}
                    className="h-9"
                    required
                  />
                </div>
                <div className="flex flex-col col-span-2">
                  <label htmlFor="license" className="text-sm font-medium mb-1">
                    License *
                  </label>
                  <Input
                    id="license"
                    name="license"
                    value={formData.license}
                    onChange={handleFormChange}
                    className="h-9"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTherapist}>Add Therapist</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-center mb-4">
            Cuddler Directory
          </h2>
          {loading ? (
            <p className="text-center">Loading...</p>
          ) : filteredUsers.length > 0 ? (
            <motion.div
              className="flex flex-wrap gap-4"
              variants={containerVariants}
            >
              <AnimatePresence>
                {filteredUsers.map((user) => (
                  <motion.div key={user._id} variants={cardVariants}>
                    <Link href={`/dashboard/users/${user._id}`}>
                      <SpecialistCard
                        name={user.name}
                        imageSrc={user.image || ""}
                        location={user.location || ""}
                        rating={user.rating || 0}
                        reviewCount={user.reviewCount || 0}
                        rate={user.rate || 0}
                      />
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <p className="text-center">No users found.</p>
          )}
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-center mb-4">
            Specialists
          </h2>
          {loading ? (
            <p className="text-center">Loading...</p>
          ) : filteredSpecialists.length > 0 ? (
            <motion.div
              className="flex flex-wrap gap-4"
              variants={containerVariants}
            >
              <AnimatePresence>
                {filteredSpecialists.map((therapist) => (
                  <motion.div key={therapist._id} variants={cardVariants}>
                    <Link href={`/dashboard/therapists/${therapist._id}`}>
                      <SpecialistCard
                        name={therapist.name}
                        imageSrc={therapist.image || ""}
                        location={therapist.location || ""}
                        rating={therapist.rating || 0}
                        reviewCount={therapist.reviewCount || 0}
                        rate={therapist.rate || 0}
                      />
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <p className="text-center">No specialists found.</p>
          )}
        </section>
      </div>
    </motion.div>
  );
}
