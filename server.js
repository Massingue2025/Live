const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para upload de vídeo via multipart/form-data
const upload = multer({ dest: 'uploads/' });

// ✅ Middleware para aceitar JSON e x-www-form-urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔄 Rota de verificação para manter servidor ativo
app.get('/ping', (req, res) => {
  res.status(200).send('Servidor ativo ✅');
});

// 🎥 Rota de recebimento do vídeo + URL da stream
app.post('/render-server', upload.single('video'), (req, res) => {
  const videoPath = req.file?.path;
  const streamUrl = req.body?.stream_url || req.body?.streamUrl;

  if (!videoPath || !streamUrl) {
    if (videoPath) {
      fs.unlink(videoPath, () => {});
    }
    return res.status(400).json({ success: false, error: 'Faltando vídeo ou stream_url.' });
  }

  console.log(`🎥 Transmitindo para: ${streamUrl}`);
  console.log(`📁 Arquivo recebido: ${videoPath}`);

  const ffmpeg = spawn('ffmpeg', [
    '-re',
    '-i', videoPath,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-maxrate', '3000k',
    '-bufsize', '6000k',
    '-pix_fmt', 'yuv420p',
    '-g', '50',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-f', 'flv',
    streamUrl
  ]);

  ffmpeg.stderr.on('data', data => {
    console.log(`[FFmpeg] ${data.toString()}`);
  });

  ffmpeg.on('close', code => {
    console.log(`🛑 Transmissão encerrada (código: ${code})`);
    fs.unlink(videoPath, err => {
      if (err) console.error('Erro ao apagar vídeo:', err);
      else console.log('🗑️ Vídeo temporário removido com sucesso');
    });
  });

  // ✅ Resposta imediata (não espera o fim da transmissão)
  return res.status(200).json({
    success: true,
    message: 'Transmissão iniciada com sucesso!',
    video: path.basename(videoPath),
    stream_url: streamUrl
  });
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor Node.js pronto: http://localhost:${PORT}`);
});
