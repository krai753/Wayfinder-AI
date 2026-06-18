/**
 * LoadingScreen — full-screen animated loader with a status line.
 * Used for short async waits (booking, searching).
 */
import { motion } from "motion/react";
import { Plane } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  speakMessage?: string;
}

export function LoadingScreen({ message = "Loading…", speakMessage }: LoadingScreenProps) {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center text-center px-8"
      style={{ background: "#0B1020" }}
      role="status"
      aria-live="polite"
    >
      <motion.div
        className="relative mb-8"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "rgba(79,70,229,0.3)", filter: "blur(20px)" }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />
        <div
          className="relative w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg,#4F46E5,#22C55E)",
            boxShadow: "0 10px 40px rgba(79,70,229,0.5)",
          }}
          aria-hidden="true"
        >
          <Plane size={36} color="#fff" />
        </div>
      </motion.div>
      <p className="text-xl font-bold text-white">{message}</p>
      <p className="text-sm text-slate-400 mt-2 sr-only">{speakMessage || message}</p>
    </div>
  );
}
