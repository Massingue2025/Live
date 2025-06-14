const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de upload com multer
const upload = multer({ dest: 'uploads/' });

// 🟢 Rota de "ping" para manter o servidor ativo
app.get('/ping', (req, res) => {
  res.status(200).send('Servidor ativo ✅');
});

// 🎬 Rota principal para receber o vídeo e iniciar live
app.post('/render-server', upload.single('video'), (req, res) => {
  const videoPath = req.file?.path;
  const streamUrl = req.body?.streamUrl;

  if (!videoPath || !streamUrl) {
    return res.status(400).json({ success: false, error: 'Faltando vídeo ou URL de stream.' });
  }

  console.log(`🎥 Iniciando transmissão para: ${streamUrl}`);

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
    console.log(`[FFmpeg] ${data}`);
  });

  ffmpeg.on('close', code => {
    console.log(`🛑 Transmissão encerrada com código ${code}`);
    // Remove vídeo temporário
    fs.unlink(videoPath, err => {
      if (err) console.error('Erro ao remover vídeo:', err);
      else console.log('🗑️ Vídeo temporário removido');
    });
  });

  res.json({ success: true, message: 'Transmissão iniciada!' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Node.js rodando em http://localhost:${PORT}`);
});
