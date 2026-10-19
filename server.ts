import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.resolve(process.cwd(), 'public')));

function getAiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint for AI Survival Companion commentary & advice
app.post('/api/ai-assistant', async (req, res) => {
  try {
    const {
      eventTrigger,
      userQuestion,
      gameState,
    } = req.body;

    const ai = getAiClient();

    const contextSummary = gameState
      ? `Персонаж: ${gameState.characterName} (${gameState.characterRole}). Локация: ${gameState.zoneName}. Погода: ${gameState.weatherName}. Время суток: ${gameState.timeOfDay}. Здоровье: ${gameState.hp}/${gameState.maxHp}. Защита от укусов: ${gameState.biteProtection}%. Оружие: ${gameState.weaponName}. Врагов рядом: ${gameState.nearbyZombies}. В транспорте: ${gameState.inVehicle ? 'Да' : 'Нет'}. Активный квест: ${gameState.activeQuest || 'Исследование'}.`
      : '';

    const promptText = userQuestion
      ? `Игрок спрашивает: "${userQuestion}". Контекст игры: ${contextSummary}. Дай краткий, атмосферный и полезный совет по выживанию (максимум 2 коротких предложения на русском языке).`
      : `Событие на экране: "${eventTrigger}". Контекст игры: ${contextSummary}. Прокомментируй ситуацию как тактический голосовой ИИ-дрон «АРИЯ» и дай совет по выживанию (максимум 2 коротких предложения на русском языке, живо и динамично).`;

    const textResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction:
          'Ты — «АРИЯ», тактический голосовой ИИ-помощник выжившего в 3D экшен-игре про зомби-апокалипсис в стиле аниме/Геншин. Отвечай ТОЛЬКО на русском языке, кратко (1-2 предложения, до 28 слов), без спецсимволов и разметки Markdown, как живой голосовой комментатор.',
        temperature: 0.8,
      },
    });

    const replyText =
      textResponse.text?.replace(/[*#_~`]/g, '').trim() ||
      'Внимание, фиксирую движение заражённых по периметру. Держите дистанцию и следите за боезапасом!';

    // Try generating neural TTS audio via gemini-3.8-flash-lite-tts
    let audioBase64: string | null = null;
    try {
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: replyText,
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      const inlineData =
        ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (inlineData) {
        audioBase64 = inlineData;
      }
    } catch (ttsErr) {
      // If TTS model is unavailable or rate-limited, client will seamlessly use Web Speech API Russian synthesis
      console.warn('TTS generation skipped, falling back to browser speech:', ttsErr);
    }

    res.json({
      text: replyText,
      audioBase64,
    });
  } catch (error: any) {
    console.error('AI Assistant error:', error?.message || error);
    res.status(200).json({
      text: 'Сканеры фиксируют активность заражённых! Используйте укрытия, улучшайте защиту от укусов и собирайте ресурсы на карте.',
      audioBase64: null,
      fallback: true,
    });
  }
});

// Endpoint to upload or replace custom 3D character GLB
app.post('/api/upload-model', async (req, res) => {
  try {
    const { fileBase64, fileName } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'No file data provided' });
    }
    const buffer = Buffer.from(fileBase64, 'base64');
    const publicDir = path.resolve(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const cleanName = fileName ? path.basename(fileName) : 'untitled (1).glb';
    fs.writeFileSync(path.join(publicDir, cleanName), buffer);
    fs.writeFileSync(path.join(publicDir, 'untitled (1).glb'), buffer);
    fs.writeFileSync(path.join(publicDir, 'untitled_1.glb'), buffer);
    fs.writeFileSync(path.resolve(process.cwd(), 'untitled (1).glb'), buffer);
    res.json({ success: true, size: buffer.length, fileName: cleanName });
  } catch (err: any) {
    console.error('Upload model error:', err);
    res.status(500).json({ error: err.message || 'Failed to save model' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
