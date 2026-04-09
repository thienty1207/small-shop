import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { cn } from "@/lib/utils";

interface BreadcrumbsProps {
  /** Map dynamic param keys → human-readable labels, e.g. { slug: product.name } */
  overrides?: Record<string, string>;
  className?: string;
}

export function Breadcrumbs({ overrides, className }: BreadcrumbsProps) {
  const crumbs = useBreadcrumbs(overrides);

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm text-gray-500 flex-wrap", className)}
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        const isFirst = i === 0;

        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400" />}

            {isLast ? (
              <span className="text-gray-800 font-medium truncate max-w-[200px]">
                {crumb.label}
              </span>
            ) : crumb.href ? (
              <Link
                to={crumb.href}
                className="hover:text-rose-500 transition-colors flex items-center gap-1"
              >
                {isFirst && <Home className="w-3.5 h-3.5 shrink-0" />}
                <span className={isFirst ? "sr-only sm:not-sr-only" : ""}>{crumb.label}</span>
              </Link>
            ) : (
              <span>{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
