const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/default", (req, res) => {
  res.sendFile(__dirname + "/default.html");
});

let frameCount = 0;
const framesDir = path.join(__dirname, "frames");

// 创建存储帧的目录
if (!fs.existsSync(framesDir)) {
  fs.mkdirSync(framesDir);
}

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("recognized-image", (imageDataURL) => {
    // 将base64图像数据转换为Buffer
    const base64Data = imageDataURL.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // 保存每一帧图片
    const framePath = path.join(framesDir, `frame_${frameCount}.png`);
    fs.writeFileSync(framePath, buffer);
    frameCount++;
    console.log(`Frame ${frameCount} saved`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");

    // 当用户断开连接时，可以合成视频
    exec(
      `ffmpeg -framerate 15 -i ${framesDir}/frame_%d.png -s 1280x720 -c:v libx264 -pix_fmt yuv420p output.mp4`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error creating video: ${error}`);
        } else {
          console.log("Video created successfully");
        }
      }
    );
  });
});

const PORT = 3000;
http.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
