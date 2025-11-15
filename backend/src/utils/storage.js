const path = require("path");
const fs = require("fs");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const userId = req.params.userId || "anon";
    const name = `${userId}-${Date.now()}-${file.originalname.replace(
      /\s+/g,
      "_"
    )}`;
    cb(null, name);
  },
});

function gifFileFilter(req, file, cb) {
  if (file.mimetype === "image/gif") {
    cb(null, true);
  } else {
    cb(new Error("Only GIF files are allowed."), false);
  }
}

const upload = multer({
  storage,
  fileFilter: gifFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { upload, UPLOAD_DIR };
