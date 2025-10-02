// backend/src/index.js
const cors = require("cors");
const app = require("./app");

const PORT = process.env.PORT || 5000;

// ✅ CORS comes first
app.use(
  cors({
    origin: "http://localhost:5173", // or process.env.FRONTEND_URL
    credentials: true,
  })
);

// ✅ Then your routes
const userRoutes = require("./routes/user");
app.use("/api/user", userRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
