// components/SpecialistsGrid.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SpecialistCard from "@/components/professionals/SpecialistCard";
import Link from "next/link";
import { Therapist } from "@/types/therapist";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Props {
  loading: boolean;
  specialists: Therapist[];
}

export function SpecialistsGrid({ loading, specialists }: Props) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Available Professionals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-64 w-full rounded-lg bg-[#C4C4C4]/50"
              />
            ))}
          </div>
        ) : specialists.length > 0 ? (
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {specialists.map((therapist) => (
                <motion.div
                  key={therapist._id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ scale: 1.05 }}
                >
                  <Link href={`/dashboard/specialists/${therapist._id}`}>
                    <SpecialistCard
                      name={therapist.name}
                      imageSrc={therapist.image || ""}
                      location={therapist.location || ""}
                      rating={therapist.rating || 0}
                      reviewCount={therapist.reviewCount || 0}
                      rate={therapist.rate || 0}
                      className="hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                    />
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <p className="text-center text-[#C4C4C4]">No specialists found.</p>
        )}
      </CardContent>
    </Card>
  );
}
