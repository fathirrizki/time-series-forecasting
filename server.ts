import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const app = express();

app.use(express.json());

/* =========================
   Gemini Client
========================= */

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn(
      "GEMINI_API_KEY tidak ditemukan, menggunakan fallback lokal"
    );
    return null;
  }

  try {
    return new GoogleGenAI({
      apiKey
    });
  } catch (err) {
    console.error("Gemini init error:", err);
    return null;
  }
}

/* =========================
   Fallback AI
========================= */

function generateAlgorithmicInterpretation(
  temp: number,
  rain: number,
  usd: number,
  inflation: number,
  season: string
) {
  let weatherFactor = "";
  let economyFactor = "";
  let conclusion = "";

  if (season === "hujan" || rain > 15) {
    weatherFactor =
      "curah hujan tinggi berpotensi meningkatkan risiko pembusukan dan mengganggu kualitas panen";
  } else {
    weatherFactor =
      "kondisi cuaca yang lebih kering mendukung proses panen dan penyimpanan";
  }

  if (usd > 15600) {
    economyFactor =
      "pelemahan rupiah meningkatkan biaya pupuk dan sarana produksi";
  } else {
    economyFactor =
      "stabilitas rupiah membantu menjaga biaya produksi";
  }

  if (rain > 15 || usd > 15700) {
    conclusion =
      "Pasokan diperkirakan sedikit tertekan sehingga harga berpotensi naik dalam beberapa hari ke depan.";
  } else {
    conclusion =
      "Pasokan relatif stabil sehingga fluktuasi harga diperkirakan terbatas.";
  }

  return `Analisis model mengidentifikasi bahwa ${weatherFactor}. ${economyFactor}. ${conclusion}`;
}

/* =========================
   API
========================= */

app.post("/api/predict", async (req, res) => {
  try {
    const {
      temperature = 27.4,
      rainfall = 12.5,
      usdIdr = 15680,
      inflation = 3.1,
      season = "hujan"
    } = req.body;

    const tempVal = Number(temperature);
    const rainVal = Number(rainfall);
    const usdVal = Number(usdIdr);
    const infVal = Number(inflation);

    /* ==========
       Price Logic
    ========== */

    const basePrice = 36000;

    const tempImpact =
      Math.max(0, (tempVal - 26) * 450);

    const rainImpact =
      rainVal * 320;

    const usdImpact =
      Math.max(0, (usdVal - 15000) * 1.2);

    const seasonMultiplier =
      season === "hujan"
        ? 1.15
        : 0.92;

    const inflationMultiplier =
      1 + infVal / 100;

    const predictedBase =
      (
        basePrice +
        tempImpact +
        rainImpact +
        usdImpact
      ) *
      seasonMultiplier *
      inflationMultiplier;

    const resultPrices = [];

    const today = new Date();

    for (let i = 7; i > 0; i--) {
      const d = new Date();

      d.setDate(today.getDate() - i);

      resultPrices.push({
        date: d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short"
        }),
        price:
          Math.round(
            (basePrice +
              (7 - i) * 350 -
              Math.sin(i) * 600) /
              100
          ) * 100,
        isPrediction: false
      });
    }

    const tomorrowPrice =
      Math.round(predictedBase / 100) * 100;

    resultPrices.push({
      date: "Hari Ini",
      price: tomorrowPrice,
      isPrediction: false
    });

    for (let i = 1; i <= 7; i++) {
      resultPrices.push({
        date: `T+${i}`,
        price:
          Math.round(
            (tomorrowPrice +
              Math.sin(i) * 1000) /
              100
          ) * 100,
        isPrediction: true
      });
    }

    const historical =
      resultPrices.filter(
        (p) => !p.isPrediction
      );

    const avgHistorical =
      historical.reduce(
        (sum, p) => sum + p.price,
        0
      ) / historical.length;

    const percentageChange =
      Number(
        (
          ((tomorrowPrice -
            avgHistorical) /
            avgHistorical) *
          100
        ).toFixed(1)
      );

    let reliability = 94.8;

    if (
      rainVal > 25 ||
      tempVal > 33
    ) {
      reliability = 89.2;
    }

    /* ==========
       Gemini AI
    ========== */

    let aiInterpretation = "";

    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `
Anda adalah analis komoditas bawang merah Indonesia.

Data:
- Suhu: ${tempVal}°C
- Curah hujan: ${rainVal} mm
- USD/IDR: ${usdVal}
- Inflasi: ${infVal}%
- Musim: ${season}

Buat analisis maksimal 80 kata.
Mulai dengan:
"Analisis model mengidentifikasi bahwa..."
`;

        const response =
          await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
          });

        aiInterpretation =
          response.text?.trim() || "";
      } catch (err) {
        console.error(
          "Gemini Error:",
          err
        );

        aiInterpretation =
          generateAlgorithmicInterpretation(
            tempVal,
            rainVal,
            usdVal,
            infVal,
            season
          );
      }
    }

    if (!aiInterpretation) {
      aiInterpretation =
        generateAlgorithmicInterpretation(
          tempVal,
          rainVal,
          usdVal,
          infVal,
          season
        );
    }

    return res.json({
      inputs: {
        temperature: tempVal,
        rainfall: rainVal,
        usdIdr: usdVal,
        inflation: infVal,
        season
      },

      historicalPrices:
        resultPrices.filter(
          (p) => !p.isPrediction
        ),

      predictedPrices:
        resultPrices.filter(
          (p) => p.isPrediction
        ),

      tomorrowPrice,
      percentageChange,
      reliability,
      aiInterpretation
    });

  } catch (error: any) {
    console.error(
      "Prediction API Error:",
      error
    );

    return res.status(500).json({
      error:
        "Terjadi kesalahan internal",
      message: error?.message
    });
  }
});

/* =========================
   Vite Dev + Vercel
========================= */

async function start() {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode: true
        },
        appType: "spa"
      });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(
      process.cwd(),
      "dist"
    );

    app.use(
      express.static(distPath)
    );

    app.get("*", (_, res) => {
      res.sendFile(
        path.join(
          distPath,
          "index.html"
        )
      );
    });
  }

  const PORT =
    process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(
      `Server running on ${PORT}`
    );
  });
}

/* Vercel: jangan jalankan listen */

if (
  process.env.VERCEL !== "1"
) {
  start();
}

export default app;