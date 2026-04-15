import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger:
    "btn bg-s_error/10 hover:bg-s_error/20 text-s_error border border-s_error/25 px-3 h-8 text-sm rounded-md",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-3 h-8  text-sm  rounded-md gap-1.5",
  md: "px-5 h-10 text-sm  rounded-lg gap-2",
  lg: "px-7 h-12 text-base rounded-xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      loading,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(variantClass[variant], sizeClass[size], className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        ) : icon ? (
          <span className="flex-shrink-0 flex items-center">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);
