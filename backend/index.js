const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const { exec } = require("child_process");
const sharp = require("sharp");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mysql = require("mysql2/promise");


const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;

// 2. Database Connection
const db = mysql.createPool({
  host: dbHost || "localhost",
  user: dbUser || "root",
  password: dbPassword || "",
  database: dbName || "video_app2",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    // origin: ["http://localhost:5173", "http://localhost:5500","http://127.0.0.1:5500","http://localhost"],
    origin: "*",
    methods: ["GET", "POST"]
  }
});



app.use(cors({
  // origin: ["http://localhost:5173", "http://localhost:5500", "http://127.0.0.1:5500", "http://localhost"],
  origin: "*",
  credentials: false // true if you set a specific origin
}));

app.use(express.json());
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
  }
}));

// 3. Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize:  5 * 1024 * 1024 * 1024 }, // 1GB Limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "video/mp4")
      return cb(new Error("Only MP4 videos allowed"));
    cb(null, true);
  },
});

// 4. Routes
app.get("/api/videos", async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, video_path, sprite_path, vtt_path FROM jobs WHERE status = "completed" ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    logger.error("Gallery fetch error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/upload", upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const jobId = req.file.filename.split("-")[0];

  try {
    await db.execute(
      "INSERT INTO jobs (id, status, video_path) VALUES (?, ?, ?)",
      [jobId, "processing", req.file.filename]
    );
    io.emit("progress", {
      jobId,
      progress: 0,
      message: "Processing started...",
    });

    const { path: filePath, filename } = req.file;
    const baseName = path.parse(filename).name;
    const outputDir = path.join("uploads", baseName);
    await fs.ensureDir(outputDir);

    const thumbDir = path.join(outputDir, "thumbs");
    await fs.ensureDir(thumbDir);

    // FFmpeg: Generate thumbnails
    const ffmpegCmd = `ffmpeg -i "${filePath}" -vf "fps=1,scale=320:180" -q:v 2 "${thumbDir}/thumb_%04d.png"`;
    await execPromise(ffmpegCmd);

    const thumbs = (await fs.readdir(thumbDir))
      .filter((f) => f.endsWith(".png"))
      .sort();
    if (thumbs.length === 0) throw new Error("No thumbnails generated");

    const MAX_THUMBS_PER_SPRITE = 25;
    const columns = 5;
    const frameWidth = 320;
    const frameHeight = 180;

    for (let s = 0; s < Math.ceil(thumbs.length / MAX_THUMBS_PER_SPRITE); s++) {
      const batch = thumbs.slice(
        s * MAX_THUMBS_PER_SPRITE,
        (s + 1) * MAX_THUMBS_PER_SPRITE
      );
      const spritePath = path.join(outputDir, `sprite_${s}.png`);
      const rows = Math.ceil(batch.length / columns);

      const overlays = batch.map((thumb, i) => ({
        input: path.join(thumbDir, thumb),
        top: Math.floor(i / columns) * frameHeight,
        left: (i % columns) * frameWidth,
      }));

      // 3. Higher quality Sharp output
      await sharp({
        create: {
          width: columns * frameWidth,
          height: rows * frameHeight,
          channels: 4,
          background: "black",
        },
      })
        .composite(overlays)
        .png({ compressionLevel: 6, adaptiveFiltering: true }) // Balanced compression
        .toFile(spritePath);
    }

    // 4. Update VTT coordinates logic
    let vtt = "WEBVTT\n\n";
    thumbs.forEach((_, i) => {
      const sIdx = Math.floor(i / MAX_THUMBS_PER_SPRITE);
      const lIdx = i % MAX_THUMBS_PER_SPRITE;
      const x = (lIdx % columns) * frameWidth;
      const y = Math.floor(lIdx / columns) * frameHeight;
      vtt += `${formatTime(i)} --> ${formatTime(i + 1)}\n`;
      vtt += `sprite_${sIdx}.png#xywh=${x},${y},${frameWidth},${frameHeight}\n\n`;
    });

 
    const vttPath = path.join(outputDir, "thumbnails.vtt");
    await fs.writeFile(vttPath, vtt);
    await fs.remove(thumbDir);

    await db.execute(
      "UPDATE jobs SET status = ?, sprite_path = ?, vtt_path = ? WHERE id = ?",
      ["completed", baseName, `${baseName}/thumbnails.vtt`, jobId]
    );

    io.emit("completed", {
      jobId,
      video: filename,
      vtt: `${baseName}/thumbnails.vtt`,
    });
    res.json({ jobId, message: "Processing completed" });
  } catch (error) {
    logger.error(`Failed for ${jobId}:`, error);
    await db.execute(
      "UPDATE jobs SET status = ?, error_message = ? WHERE id = ?",
      ["failed", error.message, jobId]
    );
    io.emit("failed", { jobId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 5. Socket.IO Streaming Logic
io.on("connection", (socket) => {
  socket.on("request-video", (data) => {
    const { videoFile } = data;
    const videoPath = path.join(__dirname, "uploads", videoFile);

    if (!fs.existsSync(videoPath)) {
      return socket.emit("video-error", { error: "Video file not found" });
    }

    const stream = fs.createReadStream(videoPath, {
      highWaterMark: 1024 * 512,
    });

    stream.on("data", (chunk) => {
      socket.emit("video-chunk", chunk);
    });

    stream.on("end", () => {
      socket.emit("video-end");
    });

    socket.on("disconnect", () => {
      stream.destroy();
    });
  });
});

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout) => (error ? reject(error) : resolve(stdout)));
  });
}

function formatTime(s) {
  const h = Math.floor(s / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${sec}.000`;
}

server.listen(4000, () => console.log("Server running on port 4000"));
