const express = require("express");
const multer = require("multer");
const cors = require("cors");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
});

app.post("/start-live", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  const streamUrl = req.body.stream_url;
  if (!streamUrl) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "stream_url é obrigatório" });
  }

  const videoPath = req.file.path;

  ffmpeg(videoPath)
    .inputOptions("-re")
    .outputOptions([
      "-c:v libx264",
      "-preset veryfast",
      "-maxrate 3000k",
      "-bufsize 6000k",
      "-pix_fmt yuv420p",
      "-g 50",
      "-c:a aac",
      "-b:a 128k",
      "-ar 44100",
      "-f flv",
    ])
    .output(streamUrl)
    .on("start", (cmd) => {
      console.log("FFmpeg iniciado:", cmd);
      res.json({ message: "Transmissão iniciada" });
    })
    .on("error", (err) => {
      console.error("Erro FFmpeg:", err.message);
      fs.unlinkSync(videoPath);
      // Como já respondeu no start, não dá pra responder aqui de novo
    })
    .on("end", () => {
      console.log("Transmissão finalizada");
      fs.unlinkSync(videoPath);
    })
    .run();
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
