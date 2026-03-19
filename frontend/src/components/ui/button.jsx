import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-bold uppercase tracking-widest transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-neutral-dark hover:shadow-lg",
        secondary: "bg-secondary text-white hover:bg-neutral-dark hover:shadow-lg",
        outline: "border-2 border-primary/20 bg-transparent text-primary hover:bg-primary hover:text-white hover:border-primary",
        ghost: "text-primary hover:bg-primary/5",
        destructive: "bg-accent text-white hover:bg-neutral-dark hover:shadow-lg",
        success: "bg-emerald-700 text-white hover:bg-neutral-dark hover:shadow-lg",
        warning: "bg-amber-600 text-white hover:bg-neutral-dark hover:shadow-lg",
      },
      size: {
        default: "h-12 px-8 py-3",
        sm: "h-9 px-4 text-[10px]",
        lg: "h-16 px-12 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
