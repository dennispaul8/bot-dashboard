import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { useState } from "react";

export default function LogoutButton() {
  const [showToast, setShowToast] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("https://bot-dashboard-5q84.onrender.com/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      localStorage.removeItem("userId");
      localStorage.removeItem("theme");

      setShowToast(true);


      setTimeout(() => {
        window.location.href = "https://tweetboard.vercel.app";
      }, 1500);
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Error logging out. Try again.");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleLogout}
        className="mt-auto flex items-center gap-2 px-4 py-2 mt-6 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all duration-200 w-full justify-center"
      >
        <LogOut size={18} /> Logout
      </button>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm px-4 py-2 rounded-xl shadow-md"
          >
            ✅ You’ve been logged out
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
