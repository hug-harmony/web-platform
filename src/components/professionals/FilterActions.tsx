// components/professionals/FilterActions.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Props {
  onApply: () => void;
  onClear: () => void;
  onClearSearch: () => void;
  searchQuery: string;
  hasPendingChanges?: boolean;
  hasActiveFilters?: boolean;
}

export function FilterActions({
  onApply,
  onClear,
  onClearSearch,
  searchQuery,
  hasPendingChanges,
  hasActiveFilters,
}: Props) {
  return (
    <div className="flex gap-4">
      <Button
        onClick={onApply}
        className="bg-white text-black hover:bg-white/80 relative"
      >
        Apply Filters
        {hasPendingChanges && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-amber-400 rounded-full animate-pulse" />
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="border-[#F3CFC6] text-[#000] hover:bg-white/80"
          >
            Clear
            <ChevronDown className="ml-1 h-3 w-3" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onClearSearch} disabled={!searchQuery}>
            Clear Search Text
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onClear}
            disabled={!hasActiveFilters && !searchQuery}
            className="text-destructive focus:text-destructive"
          >
            Clear All Filters
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
