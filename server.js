const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para permitir receber dados form-data e JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração do multer para upload na pasta 'uploads'
const upload = multer({ dest: 'uploads/' });

// Rota para "ping" (manter servidor ativo)
app.get('/ping', (req, res) => {
  res.status(200).send('Servidor ativo ✅');
});

// Rota para receber vídeo e iniciar live
app.post('/render-server', upload.single('video'), (req, res) => {
  const videoPath = req.file?.path;
  const streamUrl = req.body?.stream_url || req.body?.streamUrl;

  if (!videoPath || !streamUrl) {
    // Remover arquivo se foi recebido, mas faltou streamUrl
    if (videoPath) {
      fs.unlink(videoPath, () => {});
    }
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
    console.log(`[FFmpeg] ${data.toString()}`);
  });

  ffmpeg.on('close', code => {
    console.log(`🛑 Transmissão encerrada com código ${code}`);

    fs.unlink(videoPath, err => {
      if (err) console.error('Erro ao remover vídeo:', err);
      else console.log('🗑️ Vídeo temporário removido');
    });
  });

  // Enviar resposta imediata para não travar o PHP
  res.json({ success: true, message: 'Transmissão iniciada!' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Node.js rodando em http://localhost:${PORT}`);
});
