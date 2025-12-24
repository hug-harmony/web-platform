// components/professionals/SearchBar.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, Keyboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { forwardRef } from "react";

interface Props {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApply: () => void;
  onClear: () => void;
  onClearSearch: () => void;
  hasPendingChanges?: boolean;
  hasActiveFilters?: boolean;
}

export const SearchBar = forwardRef<HTMLInputElement, Props>(function SearchBar(
  {
    searchQuery,
    onSearchChange,
    onApply,
    onClear,
    onClearSearch,
    hasPendingChanges,
    hasActiveFilters,
  },
  ref
) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          type="text"
          placeholder="Search Professionals... (press / to focus)"
          value={searchQuery}
          onChange={onSearchChange}
          className="pl-12 pr-16 py-3 rounded-full border border-[#000] focus:ring-2 focus:ring-[#F3CFC6]/50"
          data-search-input
          aria-label="Search professionals"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center text-xs text-muted-foreground">
          <Keyboard className="h-3 w-3 mr-1" aria-hidden="true" />
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
            /
          </kbd>
        </div>
      </div>
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
    </div>
  );
});
