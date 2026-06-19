"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "light" | "sidebar";
  animate?: boolean;
}

export function GlassPanel({ children, className, variant = "default", animate = false }: GlassPanelProps) {
  const baseClass = cn(
    variant === "sidebar" ? "glass-sidebar" : variant === "light" ? "glass-panel-light" : "glass-panel",
    className
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={baseClass}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={baseClass}>{children}</div>;
}
