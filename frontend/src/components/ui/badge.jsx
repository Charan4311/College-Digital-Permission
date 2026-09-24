import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center border text-xs font-semibold transition-colors", {
  variants: {
    variant: {
      default: "border-transparent bg-blue-600 text-white",
      secondary: "border-transparent bg-slate-100 text-slate-700",
      success: "border-transparent bg-emerald-100 text-emerald-700",
      destructive: "border-transparent bg-red-100 text-red-700",
      outline: "border-slate-200 text-slate-700"
    }
  },
  defaultVariants: { variant: "default" }
});

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };