
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Force rebuild to handle GitHub changes - 2025-06-13 15:02:00
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
