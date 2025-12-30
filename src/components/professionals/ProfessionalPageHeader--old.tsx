// import React from 'react'
// import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

// const ProfessionalPageHeaderOld = () => {
//   return (
//     <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
//   <CardHeader>
//     <CardTitle className="text-2xl font-bold">Professional Directory</CardTitle>
//     <p className="text-sm opacity-80">
//       Find and connect with certified professionals
//       {total > 0 && !loading && (
//         <span className="ml-2">• {total} available</span>
//       )}
//     </p>
//   </CardHeader>
//   <CardContent className="space-y-6">
//     <SearchBar
//       ref={searchInputRef}
//       searchQuery={searchQuery}
//       onSearchChange={(e) => setSearchQuery(e.target.value)}
//       onApply={handleSearch}
//       onClear={handleClear}
//       onClearSearch={handleClearSearch}
//       hasPendingChanges={hasPendingChanges}
//       hasActiveFilters={hasActiveFilters}
//     />

//     {/* Mobile Filter Sheet */}
//     {isMobile ? (
//       <MobileFilterSheet
//         filters={filters}
//         locations={locations}
//         activeFilterCount={activeFilterCount}
//         onFilterChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
//         onCustomLocation={handleCustomLocation}
//         onApplyFilters={handleSearch}
//         onClearFilters={handleClear}
//       />
//     ) : (
//       <FilterAccordion
//         filters={filters}
//         locations={locations}
//         onFilterChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
//         onCustomLocation={handleCustomLocation}
//       />
//     )}

//     {/* Date/Time Filter Button */}
//     <Button
//       variant="outline"
//       onClick={() => setIsDateTimeDialogOpen(true)}
//       className={cn(
//         "border-[#F3CFC6] text-black dark:text-white hover:bg-[#fff]/80 relative",
//         hasDatePendingChanges && "ring-2 ring-amber-400"
//       )}
//       aria-label="Filter by availability"
//     >
//       <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
//       {selectedDate ? (
//         <span className="flex items-center gap-2">
//           {selectedDate.toLocaleDateString()} • {minutesToTime(timeRange[0])} -{" "}
//           {minutesToTime(timeRange[1])}
//           {hasDatePendingChanges && (
//             <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-medium">
//               pending
//             </span>
//           )}
//         </span>
//       ) : (
//         "Filter by Availability"
//       )}
//     </Button>

//     {/* Active Filters Summary */}
//     <ActiveFilters filters={appliedFilters} onRemove={removeFilter} />
//   </CardContent>
// </Card>;
//   )
// }

// export default ProfessionalPageHeaderOld

const ProfessionalPageHeaderOld = () => {
  return <div>ProfessionalPageHeaderOld</div>;
};

export default ProfessionalPageHeaderOld;
