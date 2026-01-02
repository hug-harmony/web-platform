// components/professionals/SearchInput.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Search, Keyboard } from "lucide-react";
import { forwardRef } from "react";

interface Props {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, Props>(
  function SearchInput({ searchQuery, onSearchChange }, ref) {
    return (
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
          className="pl-12 pr-16 py-3 rounded-lg border bg-white shadow-sm focus:ring-2 focus:ring-[#F3CFC6]/50"
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
    );
  }
);
