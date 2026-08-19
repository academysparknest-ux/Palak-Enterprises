import React from "react";
import { cn } from "../../../lib/utils";

export const SkeletonBox: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("rounded-xl skeleton-shimmer", className)} />
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3", className)}>
    <SkeletonBox className="aspect-4/3 w-full rounded-xl" />
    <SkeletonBox className="h-4 w-3/4" />
    <SkeletonBox className="h-3 w-1/2" />
    <div className="pt-2 flex justify-between items-center">
      <SkeletonBox className="h-5 w-20" />
      <SkeletonBox className="h-8 w-24 rounded-lg" />
    </div>
  </div>
);
