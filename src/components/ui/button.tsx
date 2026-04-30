import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // "default" + "destructive" render as "plastic" in the Button component.
        default: "",
        destructive: "",
        // Minimal variants (no 3D), to integrate with the UI.
        outline: "border border-input bg-background text-foreground shadow-none hover:bg-muted/60 hover:text-foreground",
        secondary: "bg-muted text-foreground shadow-none hover:bg-muted/80",
        // Keep these lightweight for icon buttons / links.
        ghost: "transition-colors hover:bg-accent hover:text-accent-foreground",
        link: "transition-colors text-primary underline-offset-4 hover:underline",
      },
      size: {
        // More compact, like "Nuevo funnel" (h-8).
        default: "h-8 px-3",
        sm: "h-7 px-2.5",
        lg: "h-9 px-4",
        icon: "h-8 w-8",
        "icon-sm": "h-7 w-7",
        "icon-xs": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

type PlasticStyle = {
  background: string
  boxShadow: string
  textClass: string
  hoverTextClass?: string
  shine?: string
  borderClass?: string
}

function getPlasticStyle(variant: NonNullable<ButtonProps["variant"]>): PlasticStyle | null {
  // Mirrors the "Nuevo funnel" PlasticButton feel.
  if (variant === "default") {
    return {
      // Use theme token so all "blue accents" are consistent (badges/progress/buttons).
      background:
        "linear-gradient(to bottom, color-mix(in oklab, var(--primary), white 22%) 0%, var(--primary) 55%, color-mix(in oklab, var(--primary), white 30%) 100%)",
      boxShadow:
        "0 2px 8px 0 color-mix(in oklab, var(--primary), transparent 65%), 0 1.5px 0 0 rgba(255,255,255,0.25) inset, 0 -2px 8px 0 color-mix(in oklab, var(--primary), transparent 55%) inset",
      textClass: "text-white",
      hoverTextClass: "group-hover:text-white",
      shine: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%, transparent 100%)",
    }
  }

  if (variant === "secondary") {
    return null
  }

  if (variant === "destructive") {
    return {
      background: "linear-gradient(to bottom, rgb(248, 113, 113) 0%, rgb(239, 68, 68) 50%, rgb(252, 165, 165) 100%)",
      boxShadow:
        "0 2px 8px 0 rgba(239, 68, 68, 0.45), 0 1.5px 0 0 rgba(255,255,255,0.25) inset, 0 -2px 8px 0 rgba(239, 68, 68, 0.45) inset",
      textClass: "text-white",
      hoverTextClass: "group-hover:text-white",
      shine: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%, transparent 100%)",
    }
  }

  if (variant === "outline") {
    return null
  }

  return null
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const v = variant ?? "default"
    const plastic = !asChild ? getPlasticStyle(v) : null

    return (
      <Comp
        className={cn(
          buttonVariants({ variant: v, size, className }),
          plastic && "group relative overflow-hidden cursor-pointer transition-[background-position] duration-700 ease-out hover:bg-[position:0%_100%]",
          plastic?.borderClass
        )}
        ref={ref}
        style={
          plastic
            ? {
                background: plastic.background,
                backgroundSize: "100% 300%",
                boxShadow: plastic.boxShadow,
              }
            : undefined
        }
        {...props}
      >
        {plastic && (
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-0 z-10 h-1/2 w-[90%] -translate-x-1/2 rounded-t-lg pointer-events-none"
            style={{ background: plastic.shine, filter: "blur(2px)" }}
          />
        )}
        {plastic ? (
          <span className={cn("relative z-20 flex items-center gap-2 transition-colors duration-500 ease-out", plastic.textClass, plastic.hoverTextClass)}>
            {props.children}
          </span>
        ) : (
          props.children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
