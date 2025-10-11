import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Palette } from "lucide-react";
import type { Theme } from "../ThemeContext";

interface ThemeSelectorProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export default function ThemeSelector({ theme, setTheme }: ThemeSelectorProps) {
  const [open, setOpen] = useState(false);

  const themes = [
    { id: "default", label: "Default" },
    { id: "dim", label: "Dim" },
    { id: "lightsout", label: "Lights Out" },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-48 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
      >
        <span className="flex items-center gap-2">
          <Palette size={16} /> {themes.find((t) => t.id === theme)?.label}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="absolute mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 overflow-hidden"
          >
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id as Theme);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 capitalize transition ${
                  theme === t.id
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
