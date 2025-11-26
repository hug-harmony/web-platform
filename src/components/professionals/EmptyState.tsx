// components/professionals/EmptyState.tsx
"use client";

import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function EmptyState({ hasFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="text-center py-12 space-y-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="font-medium text-foreground">No professionals found</p>
        <p className="text-sm text-muted-foreground mt-1">
          {hasFilters
            ? "Try adjusting your filters or search terms"
            : "No professionals are currently available"}
        </p>
      </div>
      {hasFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Clear All Filters
        </Button>
      )}
    </div>
  );
}
