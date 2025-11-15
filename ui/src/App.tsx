import { useEffect, useState } from "react";
import { Home, BarChart2, Settings, Upload, Menu, X } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { XLogoIcon } from "@phosphor-icons/react";
import { io } from "socket.io-client";
import { useTheme } from "./ThemeContext";
import { AnimatePresence, motion } from "framer-motion";
import ThemeSelector from "./components/ThemeSelector";
import LogoutButton from "./components/LogoutButton";
import Toast from "./components/Toast";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [followers, setFollowers] = useState<number | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [username, setUsername] = useState(
    localStorage.getItem("tweetboard_username") || ""
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState(
    localStorage.getItem("tweetboard_profile_image") || null
  );

  const [logs, setLogs] = useState<string[]>([]);

  const { theme, setTheme } = useTheme();


  const [customMessage, setCustomMessage] = useState(
    "🎉 Thank you for your support!"
  );
  const [gifFile, setGifFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [followerData, setFollowerData] = useState<
    { date: string; followers: number }[]
  >([]);
  const [milestoneData, setMilestoneData] = useState<
    { milestone: string; count: number }[]
  >([]);

  const [toast, setToast] = useState({
    message: "",
    type: "success" as "success" | "error",
    visible: false,
  });

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast({ ...toast, visible: false }), 3000);
  };

  useEffect(() => {
    if (!userId) return;

    const socket = io("https://bot-dashboard-5q84.onrender.com", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to socket:", socket.id);
    });


    socket.on(`log-update-${userId}`, (newLog: string) => {
      setLogs((prev) => [newLog, ...prev]);
    });

    socket.on(`follower-update-${userId}`, (newCount: number) => {
      console.log(`📈 Received follower update: ${newCount}`);
      setFollowers(newCount);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);


  useEffect(() => {
    if (followers == null) return;


    const today = new Date();
    const history = [];
    let baseFollowers = followers * 0.5;

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i * 7); // every 7 days
      const dateLabel = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });


      const followerCount = Math.round(
        baseFollowers + (followers - baseFollowers) * (1 - i / 6)
      );

      history.push({ date: dateLabel, followers: followerCount });
    }

    setFollowerData(history);


    const presetMilestones = Array.from(
      { length: 100 },
      (_, i) => (i + 1) * 100
    );
    const milestones: { milestone: string; count: number }[] = [];


    presetMilestones.forEach((m) => {
      if (followers >= m) {
        milestones.push({ milestone: m.toString(), count: m });
      }
    });


    const nextMilestone = presetMilestones.find((m) => m > followers);
    if (nextMilestone) {
      milestones.push({
        milestone: nextMilestone.toString(),
        count: followers,
      });
    }


    if (milestones.length === 0) {
      milestones.push({ milestone: "", count: followers });
    }

    setMilestoneData(milestones);
  }, [followers]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("userId");
    if (id) {
      setUserId(id);
      fetch(`https://bot-dashboard-5q84.onrender.com/api/user/${id}`)
        .then(async (res) => {
          if (res.status === 429) {
            console.warn("⚠️ Rate limit hit — using cached data");
            const cachedUsername = localStorage.getItem("tweetboard_username");
            const cachedImage = localStorage.getItem(
              "tweetboard_profile_image"
            );
            if (cachedUsername) setUsername(cachedUsername);
            if (cachedImage) setProfileImageUrl(cachedImage);
            return null;
          }

          const data = await res.json();
          if (!res.ok)
            throw new Error(data.error || "Failed to fetch user data");

          setUsername(data.username);
          setFollowers(data.followers);
          setMilestone(data.followers);
          setProfileImageUrl(data.profile_image_url);

          localStorage.setItem(
            "tweetboard_profile_image",
            data.profile_image_url
          );
          localStorage.setItem("tweetboard_username", data.username);

          console.log("Twitter data:", data);
        })
        .catch((err) => console.error("Fetch user data error:", err));
    }
  }, []);

  const connectTwitter = () => {
    window.location.href =
      "https://bot-dashboard-5q84.onrender.com/auth/twitter";
  };

  const runBot = async () => {
    setLogs((prev) => [`🚀 Bot run at ${new Date().toISOString()}`, ...prev]);

    if (!userId) {
      setLogs((prev) => [
        `❌ No user ID found — please reconnect Twitter`,
        ...prev,
      ]);
      return;
    }

    try {
      const res = await fetch(
        `https://bot-dashboard-5q84.onrender.com/api/bot/check/${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setLogs((prev) => [
          `⚠️ Error running bot: ${data.error || "Unknown error"}`,
          ...prev,
        ]);
        return;
      }

      setLogs((prev) => [
        `✅ Bot check complete — Followers: ${data.followers}, Milestone: ${data.milestone}`,
        ...prev,
      ]);

      if (data.followers) setFollowers(data.followers);
      if (data.milestone) setMilestone(data.milestone);
    } catch (err) {
      console.error("Run bot error:", err);
      setLogs((prev) => [`❌ Failed to connect to backend`, ...prev]);
    }
  };

  const fetchUserData = async (id: string) => {
    try {
      const res = await fetch(
        `https://bot-dashboard-5q84.onrender.com/api/user/${id}`
      );
      const data = await res.json();

      if (res.ok) {
        setUsername(data.username);
        setFollowers(data.followers);
        setMilestone(data.followers);
        setProfileImageUrl(data.profile_image_url);
        console.log("🔄 Refetched user data:", data);
      } else {
        console.error("Failed to fetch user data:", data.error);
      }
    } catch (err) {
      console.error("Fetch user error:", err);
    }
  };

  const handleRunBot = async () => {
    await runBot();

    if (userId) {

      await fetchUserData(userId);
    }
  };
  const saveMessage = async () => {
    setLogs((prev) => [
      `💬 Custom message updated: "${customMessage}"`,
      ...prev,
    ]);

  };

  const uploadGif = async () => {
    if (!gifFile || !userId) return;

    const formData = new FormData();
    formData.append("gif", gifFile);

    try {
      const res = await fetch(
        `https://bot-dashboard-5q84.onrender.com/api/milestone/${userId}/gif`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setLogs((prev) => [`✅ GIF uploaded: ${data.path}`, ...prev]);
      console.log("GIF upload success:", data);
      showToast("GIF uploaded successfully!", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Upload error:", message);
      setLogs((prev) => [`❌ GIF upload failed: ${message}`, ...prev]);
      showToast("GIF upload failed!", "error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "image/gif") {
      setGifFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    } else {
      alert("Please upload a GIF file only!");
    }
  };

  const colors = {
    default: {
      bg: "bg-gray-100 text-gray-900",
      hover: "hover:bg-gray-200 text-gray-800",
      active: "bg-gray-300 text-gray-900 font-semibold",
    },
    dim: {
      bg: "bg-[#15202B] text-gray-100",
      hover: "hover:bg-[#22303C] text-gray-100",
      active: "bg-[#273746] text-white font-semibold",
    },
    lightsout: {
      bg: "bg-black text-gray-100",
      hover: "hover:bg-[#161616] text-gray-100",
      active: "bg-gray-600 text-white font-semibold",
    },
  };

  const currentColors = colors[theme] || colors.default;

  const variants = {
    default: {
      initial: { opacity: 0, x: 0 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, y: 50 },
    },
    dim: {
      initial: { opacity: 0, y: -50 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 50 },
    },
    lightsout: {
      initial: { opacity: 0, y: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -50 },
    },
  };

  useEffect(() => {
    console.log("Milestone Data:", milestoneData);
  }, [milestoneData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const usernameFromAuth = params.get("username");
    const userIdFromAuth = params.get("userId");
    const profileImageUrlfromAuth = params.get("profileImageUrl");
    const followersFromAuth = params.get("followers");

    if (usernameFromAuth) {
      localStorage.setItem("tweetboard_username", usernameFromAuth);
      setUsername(usernameFromAuth);
    } else {
      const stored = localStorage.getItem("tweetboard_username");
      if (stored) setUsername(stored);
    }

    if (profileImageUrlfromAuth) {
      localStorage.setItem("tweetboard_profile_image", profileImageUrlfromAuth);
      setProfileImageUrl(profileImageUrlfromAuth);
    } else {
      const stored = localStorage.getItem("tweetboard_profile_image");
      if (stored) setProfileImageUrl(stored);
    }

    if (userIdFromAuth) {
      localStorage.setItem("tweetboard_userId", userIdFromAuth);
      setUserId(userIdFromAuth);
    } else {
      const stored = localStorage.getItem("tweetboard_userId");
      if (stored) setUserId(stored);
    }


    if (followersFromAuth) {
      localStorage.setItem("tweetboard_followers", followersFromAuth);
      setFollowers(Number(followersFromAuth));
    } else {
      const stored = localStorage.getItem("tweetboard_followers");
      if (stored) setFollowers(Number(stored));
    }
  }, []);


  useEffect(() => {
    if (followers !== null) {
      localStorage.setItem("tweetboard_followers", followers.toString());
    }
  }, [followers]);

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg text-text">
        <div className="bg-bg text-text p-10 rounded-2xl text-center">
          <motion.img
            src="/tweetboard.png"
            alt="TweetBoard logo"
            className="w-24 h-24 mx-auto mb-4 object-contain"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          />

          <h1 className="text-text  text-2xl font-bold mb-6">TweetBoard</h1>
          <p className="text-text mb-6">
            Automate your milestone tweets and celebrate your growth
            effortlessly
          </p>

          <button
            onClick={connectTwitter}
            className="flex items-center justify-center text-white gap-3 bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold mx-auto"
          >
            Connect with{" "}
            <span>
              <XLogoIcon size={22} weight="bold" />
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={theme} // triggers animation when theme changes
        initial={variants[theme].initial}
        animate={variants[theme].animate}
        exit={variants[theme].exit}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={`min-h-screen transition-colors duration-500 ${theme === "default"
            ? "bg-white text-black"
            : theme === "dim"
              ? "bg-[#15202B] text-gray-100"
              : "bg-black text-gray-100"
          }`}
      >
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onClose={() => setToast({ ...toast, visible: false })}
        />

        <div className="flex flex-col md:flex-row min-h-screen bg-bg text-text">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between p-4 bg-bg text-text">
            <h1 className="text-xl font-bold">TweetBoard</h1>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Sidebar */}
          <aside
            className={`fixed md:static z-20 top-0 left-0 min-h-screen p-6 w-64 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
              } transition-all duration-500 ease-in-out md:translate-x-0 flex flex-col justify-between ${currentColors.bg
              }`}
          >
            <div>
              <h1 className="text-2xl font-bold mb-10 hidden md:block">
                TweetBoard
              </h1>

              {username && (
                <div className="flex items-center gap-3 mb-6">
                  {profileImageUrl && (
                    <img
                      src={profileImageUrl}
                      alt="Profile"
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-semibold">@{username}</p>
                    <p className="text-sm text-slate-400">
                      {followers} followers
                    </p>
                  </div>
                </div>
              )}

              <nav className="space-y-2">
                {[
                  { tab: "overview", icon: Home, label: "Overview" },
                  { tab: "analytics", icon: BarChart2, label: "Analytics" },
                  { tab: "settings", icon: Settings, label: "Settings" },
                ].map(({ tab, icon: Icon, label }) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full text-left p-2 rounded-xl transition-colors duration-200 ${activeTab === tab
                        ? currentColors.active
                        : currentColors.hover
                      }`}
                  >
                    <Icon size={18} /> <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* ✅ Logout stays pinned at the bottom */}
            <div className="mt-8">
              <LogoutButton />
            </div>
          </aside>

          {/* Overlay for mobile sidebar */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden z-10"
            ></div>
          )}

          {/* Main content */}
          <main className="flex-1 p-6 md:p-10 mt-4 md:mt-0">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
              {activeTab === "overview" && (
                <button
                  onClick={handleRunBot}
                  className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors duration-300"
                >
                  Run Bot
                </button>
              )}
            </div>

            {/* Tabs */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Welcome Header */}
                <div className="flex items-center gap-4">
                  {profileImageUrl && (
                    <img
                      src={profileImageUrl}
                      alt="Profile"
                      className="w-12 h-12 rounded-full border-2 border-blue-500 shadow-sm"
                    />
                  )}
                  <div>
                    <h2 className="text-xl font-bold">
                      Welcome,{" "}
                      <span className="text-blue-500">
                        @{username || "friend"}
                      </span>{" "}
                      👋
                    </h2>
                    <p
                      className={`text-sm ${theme === "default" ? "text-gray-500" : "text-slate-400"
                        }`}
                    >
                      Glad to have you back!
                    </p>
                  </div>
                </div>

                {/* Stats & Activity Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Follower Count */}
                  <div
                    className={`rounded-2xl p-6 transition-colors duration-500 ${theme === "default"
                        ? "bg-gray-100 text-gray-900"
                        : theme === "dim"
                          ? "bg-gray-800 text-gray-100"
                          : "bg-white/10 text-gray-200"
                      }`}
                  >
                    <h2 className="text-lg font-semibold">Follower Count</h2>
                    <p className="text-3xl font-bold mt-2">
                      {followers !== null ? followers : "Loading..."}
                    </p>
                  </div>

                  {/* Last Milestone */}
                  <div
                    className={`rounded-2xl p-6 transition-colors duration-500 ${theme === "default"
                        ? "bg-gray-100 text-gray-900"
                        : theme === "dim"
                          ? "bg-gray-800 text-gray-100"
                          : "bg-white/10 text-gray-200"
                      }`}
                  >
                    <h2 className="text-lg font-semibold">Last Milestone</h2>
                    <p className="text-3xl font-bold mt-2">{milestone}</p>
                  </div>

                  {/* Activity Log */}
                  <div className="md:col-span-2">
                    <h2 className="text-lg font-semibold mb-3">Activity Log</h2>
                    <div
                      className={`rounded-lg p-4 text-sm h-60 overflow-y-auto space-y-2 flex flex-col transition-colors duration-500 ${theme === "default"
                          ? "bg-gray-100 text-gray-900"
                          : theme === "dim"
                            ? "bg-gray-800 text-gray-100"
                            : "bg-white/10 text-gray-300"
                        }`}
                    >
                      {logs.length === 0 ? (
                        <p
                          className={`text-center mt-20 ${theme === "default"
                              ? "text-gray-500"
                              : "text-slate-400"
                            }`}
                        >
                          No activity log yet
                        </p>
                      ) : (
                        logs.map((log, i) => <p key={i}>{log}</p>)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 transition-colors duration-500">
                {/* Follower Growth */}
                <div
                  className={`rounded-xl p-6 transition-colors duration-500 ${theme === "default"
                      ? "bg-gray-100 text-gray-900"
                      : theme === "dim"
                        ? "bg-white/10 text-gray-100"
                        : "bg-white/10 text-gray-200"
                    }`}
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Follower Growth 📈
                  </h3>

                  {followerData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={followerData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={theme === "default" ? "#ddd" : "#444"}
                        />
                        <XAxis
                          dataKey="date"
                          stroke={theme === "default" ? "#555" : "#ccc"}
                        />
                        <YAxis stroke={theme === "default" ? "#555" : "#ccc"} />
                        <Tooltip
                          contentStyle={{
                            background:
                              theme === "default"
                                ? "#f9f9f9"
                                : theme === "dim"
                                  ? "#1e293b"
                                  : "#0f172a",
                            border: "none",
                            color: theme === "default" ? "#000" : "#fff",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="followers"
                          stroke={theme === "default" ? "#2563eb" : "#3b82f6"}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-400 mt-8">
                      No follower data yet
                    </p>
                  )}
                </div>

                {/* Milestones Hit */}
                <div
                  className={`rounded-xl p-6 transition-colors duration-500 ${theme === "default"
                      ? "bg-gray-100 text-gray-900"
                      : theme === "dim"
                        ? "bg-white/10 text-gray-100"
                        : "bg-white/10 text-gray-200"
                    }`}
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Milestones Hit 🎯
                  </h3>

                  {milestoneData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={milestoneData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={theme === "default" ? "#ddd" : "#444"}
                        />
                        <XAxis
                          dataKey="milestone"
                          stroke={theme === "default" ? "#555" : "#ccc"}
                        />
                        <YAxis stroke={theme === "default" ? "#555" : "#ccc"} />
                        <Tooltip
                          contentStyle={{
                            background:
                              theme === "default"
                                ? "#f9f9f9"
                                : theme === "dim"
                                  ? "#1e293b"
                                  : "#0f172a",
                            border: "none",
                          }}
                          itemStyle={{
                            color: theme === "default" ? "#000" : "#fff", // fixes text color inside tooltip
                          }}
                          labelStyle={{
                            color: theme === "default" ? "#000" : "#fff", // fixes label text too
                          }}
                        />

                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {milestoneData.map((entry, index) => {
                            const milestoneValue = Number(entry.milestone);
                            const isReached =
                              (followers ?? 0) >= milestoneValue;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={isReached ? "#22c55e" : "#83868bff"}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-400 mt-8">
                      No milestone data yet
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="bg-white/10 p-6 rounded-xl space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Theme</h3>
                  <ThemeSelector theme={theme} setTheme={setTheme} />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Custom Message</h3>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full p-3 rounded-lg bg-bg text-text border border-slate-600"
                  />
                  <button
                    onClick={saveMessage}
                    className="mt-3 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg"
                  >
                    Save Message
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Upload Celebration GIF 🎞️
                  </h3>
                  <input
                    type="file"
                    accept="image/gif"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-500 file:text-white
                  hover:file:bg-blue-600"
                  />
                  {preview && (
                    <div className="mt-3">
                      <p className="text-sm text-slate-400">Preview:</p>
                      <img
                        src={preview}
                        alt="GIF preview"
                        className="rounded-lg border mt-2 w-48"
                      />
                    </div>
                  )}
                  <button
                    onClick={uploadGif}
                    disabled={!gifFile}
                    className="mt-3 bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg"
                  >
                    <Upload size={16} className="inline mr-2" />
                    Upload GIF
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
