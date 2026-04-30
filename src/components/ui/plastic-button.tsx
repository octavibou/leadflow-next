import * as React from "react";
import { cn } from "@/lib/utils";

type PlasticButtonVariant = 
  | "primary" 
  | "blue" | "blue-muted"
  | "green" | "green-muted"
  | "purple" | "purple-muted"
  | "gold" | "gold-muted"
  | "dark" | "dark-active";

export interface PlasticButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: PlasticButtonVariant;
}

const variantStyles: Record<PlasticButtonVariant, {
  gradient: string;
  boxShadow: string;
  textColor: string;
  hoverTextColor: string;
}> = {
  // Blue - Active
  primary: {
    gradient: "linear-gradient(to bottom, color-mix(in oklab, var(--primary), white 22%) 0%, var(--primary) 55%, color-mix(in oklab, var(--primary), white 30%) 100%)",
    boxShadow: "0 2px 8px 0 color-mix(in oklab, var(--primary), transparent 65%), 0 1.5px 0 0 rgba(255,255,255,0.25) inset, 0 -2px 8px 0 color-mix(in oklab, var(--primary), transparent 55%) inset",
    textColor: "text-white",
    hoverTextColor: "group-hover:text-white",
  },
  blue: {
    gradient: "linear-gradient(to bottom, color-mix(in oklab, var(--primary), white 22%) 0%, var(--primary) 55%, color-mix(in oklab, var(--primary), white 30%) 100%)",
    boxShadow: "0 2px 8px 0 color-mix(in oklab, var(--primary), transparent 65%), 0 1.5px 0 0 rgba(255,255,255,0.25) inset, 0 -2px 8px 0 color-mix(in oklab, var(--primary), transparent 55%) inset",
    textColor: "text-white",
    hoverTextColor: "group-hover:text-white",
  },
  // Blue - Muted (inactive)
  "blue-muted": {
    gradient: "linear-gradient(to bottom, rgb(30, 58, 95) 0%, rgb(23, 47, 77) 50%, rgb(37, 99, 235) 100%)",
    boxShadow: "0 1px 4px 0 rgba(0, 0, 0, 0.3), 0 1px 0 0 rgba(255,255,255,0.08) inset",
    textColor: "text-blue-300/70",
    hoverTextColor: "group-hover:text-white",
  },
  // Green - Active (green-400 style)
  green: {
    gradient: "linear-gradient(to bottom, rgb(74, 222, 128) 0%, rgb(34, 197, 94) 50%, rgb(134, 239, 172) 100%)",
    boxShadow: "0 2px 8px 0 rgba(34, 197, 94, 0.5), 0 1.5px 0 0 rgba(255,255,255,0.3) inset, 0 -2px 8px 0 rgba(34, 197, 94, 0.5) inset",
    textColor: "text-white",
    hoverTextColor: "group-hover:text-white",
  },
  // Green - Muted (inactive)
  "green-muted": {
    gradient: "linear-gradient(to bottom, rgb(22, 78, 55) 0%, rgb(20, 60, 45) 50%, rgb(74, 222, 128) 100%)",
    boxShadow: "0 1px 4px 0 rgba(0, 0, 0, 0.3), 0 1px 0 0 rgba(255,255,255,0.08) inset",
    textColor: "text-green-400/70",
    hoverTextColor: "group-hover:text-white",
  },
  // Purple - Active
  purple: {
    gradient: "linear-gradient(to bottom, rgb(139, 92, 246) 0%, rgb(124, 58, 237) 50%, rgb(167, 139, 250) 100%)",
    boxShadow: "0 2px 8px 0 rgba(124, 58, 237, 0.4), 0 1.5px 0 0 rgba(255,255,255,0.25) inset, 0 -2px 8px 0 rgba(124, 58, 237, 0.5) inset",
    textColor: "text-white",
    hoverTextColor: "group-hover:text-white",
  },
  // Purple - Muted (inactive)
  "purple-muted": {
    gradient: "linear-gradient(to bottom, rgb(55, 35, 95) 0%, rgb(45, 28, 78) 50%, rgb(139, 92, 246) 100%)",
    boxShadow: "0 1px 4px 0 rgba(0, 0, 0, 0.3), 0 1px 0 0 rgba(255,255,255,0.08) inset",
    textColor: "text-purple-400/70",
    hoverTextColor: "group-hover:text-white",
  },
  // Gold/Skool - Active (#f8d582)
  gold: {
    gradient: "linear-gradient(to bottom, rgb(248, 213, 130) 0%, rgb(234, 179, 8) 50%, rgb(253, 224, 156) 100%)",
    boxShadow: "0 2px 8px 0 rgba(234, 179, 8, 0.4), 0 1.5px 0 0 rgba(255,255,255,0.35) inset, 0 -2px 8px 0 rgba(234, 179, 8, 0.5) inset",
    textColor: "text-amber-900",
    hoverTextColor: "group-hover:text-amber-900",
  },
  // Gold/Skool - Muted (inactive)
  "gold-muted": {
    gradient: "linear-gradient(to bottom, rgb(80, 65, 30) 0%, rgb(60, 50, 20) 50%, rgb(248, 213, 130) 100%)",
    boxShadow: "0 1px 4px 0 rgba(0, 0, 0, 0.3), 0 1px 0 0 rgba(255,255,255,0.08) inset",
    textColor: "text-amber-400/70",
    hoverTextColor: "group-hover:text-amber-900",
  },
  // Dark variants (for generic dark buttons)
  dark: {
    gradient: "linear-gradient(to bottom, rgb(63, 63, 70) 0%, rgb(39, 39, 42) 50%, rgb(82, 82, 91) 100%)",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 0 0 rgba(255,255,255,0.08) inset",
    textColor: "text-zinc-300",
    hoverTextColor: "group-hover:text-white",
  },
  "dark-active": {
    gradient: "linear-gradient(to bottom, rgb(250, 250, 250) 0%, rgb(229, 229, 229) 50%, rgb(255, 255, 255) 100%)",
    boxShadow: "0 2px 8px 0 rgba(0, 0, 0, 0.15), 0 1px 0 0 rgba(255,255,255,0.9) inset",
    textColor: "text-zinc-900",
    hoverTextColor: "group-hover:text-zinc-900",
  },
};

const PlasticButton = React.forwardRef<HTMLButtonElement, PlasticButtonProps>(
  ({ className, children, disabled, variant = "primary", ...props }, ref) => {
    const styles = variantStyles[variant];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "group relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm",
          "overflow-hidden cursor-pointer",
          "transition-[background-position] duration-700 ease-out",
          "hover:bg-[position:0%_100%]",
          "active:scale-[0.98]",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        style={{
          background: styles.gradient,
          backgroundSize: "100% 300%",
          boxShadow: styles.boxShadow,
        }}
        {...props}
      >
        {/* Top shine */}
        <span
          className="absolute left-1/2 top-0 z-10 w-[90%] h-1/2 -translate-x-1/2 rounded-t-lg pointer-events-none"
          style={{
            background: variant === "dark-active"
              ? "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%, transparent 100%)"
              : "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%, transparent 100%)",
            filter: "blur(2px)",
          }}
        />
        
        {/* Content */}
        <span className={cn(
          "relative z-20 flex items-center gap-2 transition-colors duration-500 ease-out",
          styles.textColor,
          styles.hoverTextColor
        )}>{children}</span>
      </button>
    );
  }
);

PlasticButton.displayName = "PlasticButton";

export { PlasticButton };
