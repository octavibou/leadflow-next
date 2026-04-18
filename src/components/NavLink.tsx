'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps {
  href?: string;
  to?: string;
  className?: string;
  activeClassName?: string;
  end?: boolean;
  children?: React.ReactNode;
  [key: string]: any;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, to, href, end, ...props }, ref) => {
    const pathname = usePathname();
    const dest = href || to || "/";
    const isActive = end ? pathname === dest : pathname.startsWith(dest);

    return (
      <Link
        ref={ref}
        href={dest}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
