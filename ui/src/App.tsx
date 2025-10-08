import { useEffect, useState } from "react";
import { Home, BarChart2, Settings, LogOut, Upload } from "lucide-react";
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
} from "recharts";
import { io } from "socket.io-client";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [followers, setFollowers] = useState<number | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Settings state
  // Settings state
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

  useEffect(() => {
    if (!userId) return;

    const socket = io("https://bot-dashboard-5q84.onrender.com", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to socket:", socket.id);
    });

    // Listen for new log entries
    socket.on(`log-update-${userId}`, (newLog: string) => {
      setLogs((prev) => [newLog, ...prev]);
    });

    // Listen for live follower updates
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

  // Generate mock analytics when followers are fetched
  useEffect(() => {
    if (followers) {
      const mockHistory = [
        { date: "Sep 20", followers: Math.floor(followers * 0.7) },
        { date: "Sep 23", followers: Math.floor(followers * 0.8) },
        { date: "Sep 26", followers: Math.floor(followers * 0.9) },
        { date: "Sep 29", followers: Math.floor(followers * 0.95) },
        { date: "Oct 4", followers },
        { date: "Oct 5", followers },
      ];
      setFollowerData(mockHistory);

      // Auto-generate milestones (every 500)
      const milestones = [];
      for (let m = 500; m <= followers; m += 500) {
        milestones.push({ milestone: m.toString(), count: 1 });
      }
      setMilestoneData(milestones);
    }
  }, [followers]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("userId");
    if (id) {
      setUserId(id);
      fetch(`https://bot-dashboard-5q84.onrender.com/api/user/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setUsername(data.username);
          setFollowers(data.followers);
          setMilestone(data.followers);
          setProfileImageUrl(data.profile_image_url);
          console.log("Twitter data:", data);
        })
        .catch((err) => console.error(err));
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

      // Optionally update UI values
      if (data.followers) setFollowers(data.followers);
      if (data.milestone) setMilestone(data.milestone);
    } catch (err) {
      console.error("Run bot error:", err);
      setLogs((prev) => [`❌ Failed to connect to backend`, ...prev]);
    }
  };
  const handleRunBot = async () => {
    await runBot();
    // await fetchLogs();
  };
  const saveMessage = async () => {
    setLogs((prev) => [
      `💬 Custom message updated: "${customMessage}"`,
      ...prev,
    ]);
    // POST to /api/config/:userId/message
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Upload error:", message);
      setLogs((prev) => [`❌ GIF upload failed: ${message}`, ...prev]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "image/gif") {
      setGifFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // cleanup old preview when replaced
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      alert("Please upload a GIF file only!");
    }
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="bg-slate-800 p-10 rounded-2xl text-center">
          <h1 className="text-2xl font-bold mb-6">Bot Dashboard</h1>
          <button
            onClick={connectTwitter}
            className="flex items-center gap-3 bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold"
          >
            <img
              src="https://abs.twimg.com/icons/apple-touch-icon-192x192.png"
              alt="Twitter"
              className="w-6 h-6"
            />
            Connect with Twitter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 p-6 flex flex-col">
        <h1 className="text-2xl font-bold mb-10">Bot Dashboard</h1>

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
              <p className="text-sm text-slate-400">{followers} followers</p>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-4">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-slate-700 ${
              activeTab === "overview" ? "bg-slate-700" : ""
            }`}
          >
            <Home size={18} /> Overview
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-slate-700 ${
              activeTab === "analytics" ? "bg-slate-700" : ""
            }`}
          >
            <BarChart2 size={18} /> Analytics
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-slate-700 ${
              activeTab === "settings" ? "bg-slate-700" : ""
            }`}
          >
            <Settings size={18} /> Settings
          </button>
        </nav>

        <button className="mt-auto flex gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
          <button
            onClick={handleRunBot}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg"
          >
            Run Bot
          </button>
        </div>

        {/* Tabs */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Follower Count</h2>
              <p className="text-3xl font-bold mt-2">
                {followers !== null ? followers : "Loading..."}
              </p>
            </div>

            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Last Milestone</h2>
              <p className="text-3xl font-bold mt-2">{milestone}</p>
            </div>

            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-3">Activity Log</h2>
              <div className="bg-black/40 rounded-lg p-4 text-sm h-60 overflow-y-auto space-y-2 flex flex-col">
                {logs.length === 0 ? (
                  <p className="text-slate-400 text-center mt-20">
                    No activity log yet
                  </p>
                ) : (
                  logs.map((log, i) => <p key={i}>{log}</p>)
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">📈 Follower Growth</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={followerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                  <XAxis dataKey="date" stroke="#ccc" />
                  <YAxis stroke="#ccc" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="followers"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">🎯 Milestones Hit</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={milestoneData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                  <XAxis dataKey="milestone" stroke="#ccc" />
                  <YAxis stroke="#ccc" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="bg-white/10 p-6 rounded-xl space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">💬 Custom Message</h3>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-800 text-white border border-slate-600"
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
                🎞️ Upload Celebration GIF
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
  );
}
