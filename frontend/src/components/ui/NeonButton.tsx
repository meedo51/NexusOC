"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NeonButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "purple" | "blue" | "teal";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}

export function NeonButton({
  children,
  onClick,
  variant = "purple",
  size = "md",
  className,
  disabled,
  type = "button",
}: NeonButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const glowClass = {
    purple: "neon-glow",
    blue: "neon-glow-blue",
    teal: "neon-glow-teal",
  };

  const borderClass = {
    purple: "border-nexus-accent-purple/30 hover:border-nexus-accent-purple/60",
    blue: "border-nexus-accent-blue/30 hover:border-nexus-accent-blue/60",
    teal: "border-nexus-accent-teal/30 hover:border-nexus-accent-teal/60",
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        "relative rounded-lg font-medium transition-all duration-200",
        "border backdrop-blur-sm",
        "text-white",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        sizeClasses[size],
        borderClass[variant],
        glowClass[variant],
        className
      )}
    >
      {children}
    </motion.button>
  );
}
