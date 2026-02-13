"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";

interface ListenLiveButtonProps {
  href: string;
}

export function ListenLiveButton({ href }: ListenLiveButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Listen to The Island live on WART 95.5 FM"
      className="listen-live-btn"
        whileHover={
          shouldReduceMotion
            ? undefined
            : {
                scale: 1.05,
                boxShadow: "0 0 30px rgba(255, 215, 0, 0.6)",
              }
        }
        whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
        animate={
          shouldReduceMotion
            ? undefined
            : {
                boxShadow: [
                  "0 0 10px rgba(255, 215, 0, 0.3)",
                  "0 0 20px rgba(255, 215, 0, 0.5)",
                  "0 0 10px rgba(255, 215, 0, 0.3)",
                ],
              }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
      >
      <span className="pulse-indicator" aria-hidden />
      Listen Live
    </motion.a>
  );
}
