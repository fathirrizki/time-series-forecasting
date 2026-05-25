import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sprout,
  User,
  TrendingUp,
  TrendingDown,
  Calendar,
  CloudRain,
  Scale,
  Star,
  FileText,
  Satellite,
  CheckCircle,
  Download,
  Brain,
  Sliders,
  Sparkles,
  RefreshCw,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  ChevronRight,
  Database
} from "lucide-react";
import { DatasetItem, PredictionInput, PredictionResponse } from "./types";

const INITIAL_DATASET: DatasetItem[] = [
  { tanggal: "12/05/2026", harga: 34500, status: "STABIL" },
  { tanggal: "13/05/2026", harga: 38200, status: "NAIK" },
  { tanggal: "14/05/2026", harga: 37000, status: "STABIL" },
  { tanggal: "15/05/2026", harga: 33800, status: "TURUN" },
  { tanggal: "16/05/2026", harga: 34100, status: "STABIL" },
  { tanggal: "17/05/2026", harga: 35900, status: "NAIK" },
  { tanggal: "18/05/2026", harga: 36200, status: "STABIL" },
  { tanggal: "19/05/2026", harga: 35500, status: "TURUN" },
  { tanggal: "20/05/2026", harga: 37800, status: "NAIK" },
  { tanggal: "21/05/2026", harga: 38500, status: "NAIK" },
  { tanggal: "22/05/2026", harga: 36900, status: "TURUN" },
  { tanggal: "23/05/2026", harga: 37200, status: "STABIL" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"welcome" | "inference">("welcome");
  const [dataset, setDataset] = useState<DatasetItem[]>(INITIAL_DATASET);
  const [isDatasetFullscreen, setIsDatasetFullscreen] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // Prediction App State
  const [inputs, setInputs] = useState<PredictionInput>({
    temperature: 27.4,
    rainfall: 12.5,
    usdIdr: 15680,
    inflation: 3.1,
    season: "hujan",
  });
  const [predictionData, setPredictionData] = useState<PredictionResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [hoveredChartPoint, setHoveredChartPoint] = useState<{
    date: string;
    price: number;
    isPrediction: boolean;
    x: number;
    y: number;
  } | null>(null);

  // Reference for debouncing API requests
  const apiDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPredictions = async (
    currentInputs: PredictionInput,
    useDebounce = true
  ) => {
    setIsPredicting(true);

    if (apiDebounceRef.current) {
      clearTimeout(apiDebounceRef.current);
    }

    const performFetch = async () => {
      try {
        // batalkan request lama jika masih berjalan
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const res = await fetch("/api/predict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(currentInputs),
          signal: controller.signal
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
            data?.message ||
            "Prediction API error"
          );
        }

        setPredictionData(data);

      } catch (err: any) {

        // abaikan abort normal
        if (err.name === "AbortError") {
          return;
        }

        console.error(
          "Prediction fetch error:",
          err.message
        );

      } finally {
        setIsPredicting(false);
      }
    };

    if (useDebounce) {
      apiDebounceRef.current = setTimeout(
        performFetch,
        600
      );
    } else {
      await performFetch();
    }
  };

  useEffect(() => {
    fetchPredictions(inputs, false);

    return () => {
      if (apiDebounceRef.current) {
        clearTimeout(apiDebounceRef.current);
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleInputChange = (
    key: keyof PredictionInput,
    value: any
  ) => {
    const updated = {
      ...inputs,
      [key]: value
    };

    setInputs(updated);

    fetchPredictions(updated, true);
  };

  // Add custom manual data key to landing table
  const [newTanggal, setNewTanggal] = useState("");
  const [newHarga, setNewHarga] = useState("");
  const [newStatus, setNewStatus] = useState<"STABIL" | "NAIK" | "TURUN">("STABIL");

  const handleAddDatasetRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTanggal || !newHarga) return;
    const priceNum = parseInt(newHarga.replace(/\D/g, ""));
    if (isNaN(priceNum)) return;

    const newItem: DatasetItem = {
      tanggal: newTanggal,
      harga: priceNum,
      status: newStatus,
    };

    setDataset([newItem, ...dataset]);
    setNewTanggal("");
    setNewHarga("");
    triggerNotification("Data baru berhasil ditambahkan ke dataset!");
  };

  const triggerNotification = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => {
      setShowNotification(null);
    }, 3500);
  };

  // Generate and download polished CSV report
  const handleDownloadCSV = () => {
    const headers = "TANGGAL,HARGA/KG,STATUS\n";
    const csvRows = dataset
      .map(
        (item) =>
          `"${item.tanggal}","Rp ${item.harga.toLocaleString("id-ID")}","${item.status}"`
      )
      .join("\n");
    const blob = new Blob([headers + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `AVS-Dataset-Bawang-Merah-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("Laporan lengkap (.CSV) sukses diunduh!");
  };

  // SVG Chart Dimensions & Configuration
  const chartWidth = 720;
  const chartHeight = 240;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  // Process coordinates based on current API dataset response
  const points: {
    date: string;
    price: number;
    isPrediction: boolean;
    x: number;
    y: number;
  }[] = [];

  if (predictionData) {
    const allData = [
      ...predictionData.historicalPrices,
      ...predictionData.predictedPrices,
    ];
    // Find min & max prices for scaled vertical plotting
    const prices = allData.map((d) => d.price);
    const maxPrice = Math.max(...prices, 48000) * 1.05;
    const minPrice = Math.min(...prices, 32000) * 0.95;

    const totalPoints = allData.length;
    const availableWidth = chartWidth - paddingLeft - paddingRight;
    const availableHeight = chartHeight - paddingTop - paddingBottom;

    allData.forEach((d, index) => {
      const x = paddingLeft + (index / (totalPoints - 1)) * availableWidth;
      const y =
        paddingTop + (1 - (d.price - minPrice) / (maxPrice - minPrice)) * availableHeight;
      points.push({
        date: d.date,
        price: d.price,
        isPrediction: d.isPrediction,
        x,
        y,
      });
    });
  }

  // Segmented SVG Path builders
  const getHistoricalPath = () => {
    const histPoints = points.filter((p) => !p.isPrediction);
    if (histPoints.length === 0) return "";
    return histPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  };

  const getPredictionPath = () => {
    // Prediction starts exactly at the end of the historical line
    const histPoints = points.filter((p) => !p.isPrediction);
    const predPoints = points.filter((p) => p.isPrediction);
    if (predPoints.length === 0 || histPoints.length === 0) return "";

    const lastHist = histPoints[histPoints.length - 1];
    const pathString = [`M${lastHist.x},${lastHist.y}`];
    predPoints.forEach((p) => {
      pathString.push(`L${p.x},${p.y}`);
    });
    return pathString.join(" ");
  };

  const getAreaPath = () => {
    if (points.length === 0) return "";
    const start = points[0];
    const end = points[points.length - 1];
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    return `${linePath} L${end.x},${chartHeight - paddingBottom} L${start.x},${chartHeight - paddingBottom} Z`;
  };

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed flex flex-col justify-between">
      {/* Dynamic Native Notification Banner */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-100 bg-primary text-on-primary px-6 py-3 rounded-xl shadow-lg border border-primary-container flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5 text-primary-fixed" />
            <span className="font-sans font-medium text-sm">{showNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner Navigation Bar */}
      <nav className="h-24 px-10 border-b border-primary/10 flex items-center justify-between sticky top-0 z-50 bg-background/90 backdrop-blur-md transition-all duration-300">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
          {/* Logo Brand Title */}
          <div className="flex items-baseline gap-2">
            <span className="font-serif italic text-3xl font-extrabold tracking-tighter text-primary">
              AgroVista
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold opacity-50 text-on-surface">
              Archive v.26
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex gap-12 text-[11px] uppercase tracking-[0.25em] font-bold">
            <button
              onClick={() => setActiveTab("welcome")}
              className={`pb-1 transition-all cursor-pointer ${
                activeTab === "welcome"
                  ? "border-b border-primary text-primary"
                  : "text-on-surface/40 hover:text-primary hover:opacity-100"
              }`}
            >
              Collections
            </button>
            <button
              onClick={() => {
                setActiveTab("inference");
                fetchPredictions(inputs, false); // Instant prediction load when navigated to Inference screen
              }}
              className={`pb-1 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "inference"
                  ? "border-b border-primary text-primary"
                  : "text-on-surface/40 hover:text-primary hover:opacity-100"
              }`}
            >
              Analysis
              <span className="inline-block bg-secondary text-white text-[9px] font-mono px-1 py-0.5 uppercase tracking-wider">
                Live
              </span>
            </button>
          </nav>

          {/* User Status Identity */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col items-end text-right">
              <span className="font-serif italic text-sm font-semibold text-on-surface leading-tight">Fathir Rizki</span>
              <span className="font-mono text-[9px] text-on-surface-variant/60 tracking-wider">REGIONAL ANALYST</span>
            </div>
            <div className="w-10 h-10 rounded-full border border-black/20 flex items-center justify-center text-[10px] font-bold bg-surface-container hover:bg-surface-container-high transition-all cursor-pointer">
              FR
            </div>
          </div>
        </div>
      </nav>

      {/* Main View Manager */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {activeTab === "welcome" ? (
            <motion.div
              key="welcome-panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="pb-16"
            >
              {/* HERO CANVAS */}
              <section className="relative min-h-[580px] lg:h-[680px] flex items-center overflow-hidden border-b border-primary/10">
                <div className="absolute inset-0 z-0">
                  <img
                    className="w-full h-full object-cover brightness-[0.55] saturate-[1.05]"
                    alt="Pemandangan ladang bawang merah subur di Minahasa, Sulawesi Utara"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUhfoei99TdLchSS5MsCgdSRvrkkXoq5__ff0UwhhQOCeO4vGpqA3dvsNu0Q8GMubkwYegofjMZut50cl2toFXp61-y_3Ls3mNVP1dij0UTgkFlN3YoJJPbdsq5lC9yJIVePvDqmH9Nkrep9YHPwVJ_-kSAkerarSNcjmGFsQZSJnI4Atjeu9afAhp9SakZB5pxXvGxZHIAS5Ag2J3F9eB_KyxSWBL0GhedhHFwPXDCZiUFxyh8ZDEhl-JTIUlyxsAMwDsNnz3Rpo"
                  />
                  {/* High contrast custom horizontal gradients */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/50 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                </div>

                <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
                  <div className="max-w-2xl py-12">
                    <motion.span
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="font-mono text-[10px] tracking-[0.3em] bg-primary text-[#F4F1EA] px-3 py-1.5 font-bold mb-6 inline-block"
                    >
                      FEATURED SYSTEM v.04
                    </motion.span>
                    <motion.h1
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-none tracking-tight text-white mb-6"
                    >
                      Data Presisi <br />
                      <span className="italic font-light">Bawang Merah.</span>
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.35 }}
                      className="font-sans text-sm sm:text-base text-white/80 mb-9 max-w-xl font-light leading-relaxed"
                    >
                      A curated computational study on the tactile nature of market price volatility in a post-digital landscape. Exploration of weather anomalies, USD rates, and regional inflation index.
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                      className="flex flex-wrap gap-4"
                    >
                      <button
                        onClick={() => {
                          setActiveTab("inference");
                          fetchPredictions(inputs, false);
                        }}
                        className="bg-white text-black font-mono text-[11px] uppercase tracking-[0.25em] px-8 py-4 hover:bg-white/90 transition-all cursor-pointer flex items-center gap-2.5 active:scale-95"
                      >
                        Inquire Access
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <a
                        href="#sumber-data"
                        className="bg-white/10 text-white font-mono text-[11px] uppercase tracking-[0.25em] backdrop-blur-md border border-white/20 px-8 py-4 hover:bg-white/20 transition-all cursor-pointer flex items-center justify-center active:scale-95"
                      >
                        Collections Index
                      </a>
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* SECTION: FAKTOR PENENTU */}
              <section className="bg-surface py-20 border-b border-primary/10">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="text-center mb-16 max-w-2xl mx-auto">
                    <span className="font-mono text-[10px] tracking-[0.3em] font-bold text-secondary uppercase bg-secondary/10 px-3 py-1.5 inline-block mb-4">
                      CURRENT STUDY 2026
                    </span>
                    <h2 className="font-serif text-4xl sm:text-5xl font-light text-primary mb-4">
                      Faktor Penentu <span className="italic">Fluktuasi Harga</span>
                    </h2>
                    <p className="font-sans text-sm text-on-surface-variant font-light leading-relaxed">
                      Memahami pemodelan variabel lingkungan, makroekonomi, dan logistik yang menggerakkan volatilitas pasar untuk pengambilan keputusan yang lebih taktis.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* WEATHER */}
                    <div className="bg-[#EBE7DF]/60 border border-primary/10 rounded-none p-8 hover:bg-[#DED9CF] hover:border-black/20 transition-all duration-300 flex flex-col justify-between group">
                      <div>
                        <div className="w-10 h-10 bg-background rounded-full border border-primary/10 flex items-center justify-center mb-8">
                          <CloudRain className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-serif text-2xl font-normal text-on-surface group-hover:italic mb-3">Anomali Cuaca</h3>
                        <p className="font-sans text-xs text-on-surface-variant leading-relaxed font-light">
                          Data curah hujan tinggi ekstrem berisiko mengurangi volume panen raya akibat pembusukan akar bawang dan kelembaban parah.
                        </p>
                      </div>
                      <div className="mt-6 text-[9px] uppercase tracking-widest font-mono font-bold opacity-30">INDEX A.01</div>
                    </div>

                    {/* SEASONAL */}
                    <div className="bg-[#EBE7DF]/60 border border-primary/10 rounded-none p-8 hover:bg-[#DED9CF] hover:border-black/20 transition-all duration-300 flex flex-col justify-between group">
                      <div>
                        <div className="w-10 h-10 bg-background rounded-full border border-primary/10 flex items-center justify-center mb-8">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-serif text-2xl font-normal text-on-surface group-hover:italic mb-3">Tren Musiman</h3>
                        <p className="font-sans text-xs text-on-surface-variant leading-relaxed font-light">
                          Siklus penanaman regional di Minahasa yang beralih antara musim penghujan dan kemarau memicu dinamika suplai pasar.
                        </p>
                      </div>
                      <div className="mt-6 text-[9px] uppercase tracking-widest font-mono font-bold opacity-30">INDEX B.02</div>
                    </div>

                    {/* FINANCIAL INFLATION */}
                    <div className="bg-[#EBE7DF]/60 border border-primary/10 rounded-none p-8 hover:bg-[#DED9CF] hover:border-black/20 transition-all duration-300 flex flex-col justify-between group">
                      <div>
                        <div className="w-10 h-10 bg-primary/10 rounded-full border border-primary/15 flex items-center justify-center mb-8">
                          <TrendingUp className="w-5 h-5 text-secondary" />
                        </div>
                        <h3 className="font-serif text-2xl font-normal text-on-surface group-hover:italic mb-3">Inflasi &amp; Kurs USD</h3>
                        <p className="font-sans text-xs text-on-surface-variant leading-relaxed font-light">
                          Perubahan tingkat nilai tukar rupiah memicu eskalasi biaya impor komponen pupuk non-subsidi dan pestisida pelindung.
                        </p>
                      </div>
                      <div className="mt-6 text-[9px] uppercase tracking-widest font-mono font-bold opacity-30">INDEX C.03</div>
                    </div>

                    {/* SUPPLY DEMAND */}
                    <div className="bg-[#EBE7DF]/60 border border-primary/10 rounded-none p-8 hover:bg-[#DED9CF] hover:border-black/20 transition-all duration-300 flex flex-col justify-between group">
                      <div>
                        <div className="w-10 h-10 bg-background rounded-full border border-primary/10 flex items-center justify-center mb-8">
                          <Scale className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-serif text-2xl font-normal text-on-surface group-hover:italic mb-3">Pasokan Luar</h3>
                        <p className="font-sans text-xs text-on-surface-variant leading-relaxed font-light">
                          Masuknya pasokan penyeimbang bawang merah dari Enrekang atau NTB mempengaruhi ketersediaan di pelabuhan &amp; pasar kota Manado.
                        </p>
                      </div>
                      <div className="mt-6 text-[9px] uppercase tracking-widest font-mono font-bold opacity-30">INDEX D.04</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* TAB SECTION: DATA SOURCES AND PREVIEW TABLE */}
              <section id="sumber-data" className="py-20 w-full max-w-7xl mx-auto px-6 border-b border-primary/10">
                <div className="mb-14">
                  <h2 className="font-serif text-4xl font-light text-primary mb-2 flex items-center gap-3">
                    Sumber Data &amp; <span className="italic">Transparansi</span>
                  </h2>
                  <p className="font-mono text-[9px] tracking-[0.3em] font-bold text-on-surface/40 uppercase">DATA ARCHIVE v.04 / PROVENANCE</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-12 items-start">
                  {/* Left Column - Meta Specs */}
                  <div className="lg:w-1/2 space-y-8">
                    <p className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed font-light">
                      Pertanian bawang merah di Sulawesi Utara merupakan komoditas penyumbang inflasi utama daerah. Kejelasan sumber data menjamin model prediksi dapat dipercaya oleh petani dan pemangku kepentingan.
                    </p>

                    <div className="space-y-4">
                      {/* Dinas Pertanian */}
                      <div className="flex items-start gap-5 p-6 border border-primary/10 rounded-none bg-[#EBE7DF]/30">
                        <div className="bg-background p-3 rounded-full border border-primary/10 flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-serif text-xl font-normal text-[#1A1A1A] mb-1">Dinas Pertanian Sulut</p>
                          <p className="font-sans text-xs text-on-surface-variant font-light">Laporan periodik luas tanam aktual dan realisasi target panen komoditas bawang merah.</p>
                        </div>
                      </div>

                      {/* BPS */}
                      <div className="flex items-start gap-5 p-6 border border-primary/10 rounded-none bg-[#EBE7DF]/30">
                        <div className="bg-background p-3 rounded-full border border-primary/10 flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-serif text-xl font-normal text-[#1A1A1A] mb-1">Badan Pusat Statistik (BPS)</p>
                          <p className="font-sans text-xs text-on-surface-variant font-light">Seri runtunan waktu pergerakan indeks harga bahan pangan konsumen dan inflasi bulanan daerah.</p>
                        </div>
                      </div>

                      {/* Geolabs */}
                      <div className="flex items-start gap-5 p-6 border border-primary/10 rounded-none bg-[#EBE7DF]/30">
                        <div className="bg-background p-3 rounded-full border border-primary/10 flex-shrink-0">
                          <Satellite className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-serif text-xl font-normal text-[#1A1A1A] mb-1">Data Satelit Geospasial</p>
                          <p className="font-sans text-xs text-on-surface-variant font-light">Peta monitoring kondisi vegetasi lahan tani dan kelembaban tanah menggunakan satelit Sentinel.</p>
                        </div>
                      </div>
                    </div>

                    {/* Integrated features tags list */}
                    <div className="p-6 rounded-none bg-[#EBE7DF] border border-primary/10">
                      <h4 className="font-mono text-[10px] tracking-[0.3em] text-primary font-bold mb-4 uppercase">
                        SISTEM PARAMETER TERINTEGRASI
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          "Harga Historis Terverifikasi",
                          "Hukum Pasokan Musiman",
                          "Tingkat Nilai Tukar USD/IDR",
                          "Peta Iklim & Curah Hujan",
                          "Grafik Inflasi Hortikultura",
                          "Pemodelan Prediksi LSTM AI",
                        ].map((feat, i) => (
                          <div key={i} className="flex items-center gap-2.5 text-on-surface">
                            <span className="w-4 h-4 bg-primary text-on-primary rounded-full flex items-center justify-center text-[9px]">
                              ✓
                            </span>
                            <span className="font-sans text-xs font-medium text-on-surface-variant">
                              {feat}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Table Preview Card */}
                  <div className="lg:w-1/2 w-full">
                    <div className="bg-white border border-primary/10 rounded-none overflow-hidden flex flex-col">
                      <div className="bg-[#DED9CF] px-6 py-4 border-b border-primary/10 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Database className="w-3.5 h-3.5 text-on-surface-variant" />
                          <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-on-surface-variant uppercase">
                            INDEX DATASET [AVS-2026-DAILY]
                          </span>
                        </div>
                        <button
                          onClick={() => setIsDatasetFullscreen(!isDatasetFullscreen)}
                          className="hover:bg-primary/5 p-1 rounded-sm text-on-surface-variant transition-colors"
                          title="Ubah Ukuran Tampilan"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Interactive form to simulate inserting values into live dataset */}
                      <form onSubmit={handleAddDatasetRow} className="p-5 bg-[#EBE7DF]/40 border-b border-primary/10 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div className="flex flex-col gap-1.5 sm:col-span-1">
                          <label className="font-mono text-[9px] uppercase font-bold tracking-wider text-on-surface-variant/80">Tanggal</label>
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            required
                            value={newTanggal}
                            onChange={(e) => setNewTanggal(e.target.value)}
                            className="bg-white border border-primary/10 text-xs py-2 px-2.5 rounded-none font-mono focus:outline-none focus:border-primary w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-1">
                          <label className="font-mono text-[9px] uppercase font-bold tracking-wider text-on-surface-variant/80">Harga/Kg</label>
                          <input
                            type="number"
                            placeholder="e.g. 36000"
                            required
                            value={newHarga}
                            onChange={(e) => setNewHarga(e.target.value)}
                            className="bg-white border border-primary/10 text-xs py-2 px-2.5 rounded-none font-mono focus:outline-none focus:border-primary w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-1">
                          <label className="font-mono text-[9px] uppercase font-bold tracking-wider text-on-surface-variant/80">Status</label>
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as any)}
                            className="bg-white border border-primary/10 text-xs py-2 px-1.5 rounded-none font-mono focus:outline-none focus:border-primary w-full"
                          >
                            <option value="STABIL">STABIL</option>
                            <option value="NAIK">NAIK</option>
                            <option value="TURUN">TURUN</option>
                          </select>
                        </div>
                        <div className="sm:col-span-1">
                          <button
                            type="submit"
                            className="w-full bg-primary text-on-primary font-mono text-[10px] uppercase tracking-[0.16em] py-2.5 rounded-none font-bold hover:bg-primary/95 transition-all cursor-pointer"
                          >
                            Add Catalog
                          </button>
                        </div>
                      </form>

                      {/* Display Data Table limits on standard, or scrollable */}
                      <div className={`overflow-x-auto transition-all ${isDatasetFullscreen ? "max-h-[500px]" : "max-h-[290px]"}`}>
                        <table className="w-full text-left border-collapse font-sans text-xs">
                          <thead className="bg-[#EBE7DF] text-on-surface border-b border-primary/10 font-mono text-[9px] uppercase tracking-widest font-bold">
                            <tr>
                              <th className="py-3 px-6">Tanggal</th>
                              <th className="py-3 px-6">Harga / KG</th>
                              <th className="py-3 px-6 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-primary/5 font-mono text-xs">
                            {dataset.slice(0, isDatasetFullscreen ? 20 : 6).map((item, index) => (
                              <tr key={index} className="hover:bg-[#EBE7DF]/20 transition-colors">
                                <td className="py-3.5 px-6 font-semibold text-on-surface">{item.tanggal}</td>
                                <td className="py-3.5 px-6 font-bold text-primary">Rp {item.harga.toLocaleString("id-ID")}</td>
                                <td className="py-3.5 px-6 text-right">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-wider ${
                                      item.status === "STABIL"
                                        ? "bg-primary text-[#F4F1EA]"
                                        : item.status === "NAIK"
                                        ? "bg-secondary text-white"
                                        : "bg-[#C8C2B7]/60 text-primary"
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Download Footer Button with download utility action */}
                      <div className="p-4 bg-surface border-t border-primary/10">
                        <button
                          onClick={handleDownloadCSV}
                          className="w-full bg-primary text-on-primary py-4 px-4 rounded-none font-mono text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-black/90 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-[#F4F1EA]" />
                          Export Dataset (.CSV)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="inference-panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="py-10 px-6 max-w-7xl mx-auto"
            >
              {/* INTERACTIVE DASHBOARD SECTION TITLE */}
              <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-primary/10 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-serif text-3xl lg:text-4xl font-light text-on-surface leading-tight tracking-tight">
                      Prediksi Pasar <span className="italic">Bawang Merah</span>
                    </h1>
                  </div>
                  <p className="text-on-surface-variant/80 text-xs font-light mt-1.5">
                    Adjust catalog inputs below to calculate simulated 14-day local price vectors via LSTM computing engine.
                  </p>
                </div>
                {/* Reset parameters */}
                <button
                  onClick={() => {
                    const defaultInputs: PredictionInput = {
                      temperature: 27.4,
                      rainfall: 12.5,
                      usdIdr: 15680,
                      inflation: 3.1,
                      season: "hujan",
                    };
                    setInputs(defaultInputs);
                    fetchPredictions(defaultInputs, false);
                    triggerNotification("Parameter diatur ulang ke kondisi normal.");
                  }}
                  className="flex items-center gap-2 bg-white hover:bg-black hover:text-[#F4F1EA] border border-primary/15 text-primary text-[10px] uppercase tracking-[0.2em] font-mono py-3 px-5 transition-all rounded-none cursor-pointer font-bold"
                >
                  <RefreshCw className="w-3 h-3" />
                  RECALIBRATE MODEL
                </button>
              </div>

              {/* DASHBOARD BENTO GRID */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                {/* Left Column: Interactive Plot Chart */}
                <div className="md:col-span-8 space-y-6">
                  <div className="bg-white border border-primary/10 rounded-none p-6 flex flex-col relative overflow-hidden">
                    {/* Running state loader */}
                    {isPredicting && (
                      <div className="absolute top-4 right-4 flex items-center gap-2 bg-primary text-[#F4F1EA] px-3.5 py-1.5 font-mono text-[9px] uppercase tracking-wider">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        AI CALCULATING
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                        <h2 className="font-mono text-[10px] font-bold tracking-[0.25em] text-on-surface uppercase">
                          TREN HARGA (HISTORIS &amp; PREDIKSI)
                        </h2>
                        <p className="text-[10px] text-on-surface-variant/70 mt-0.5">
                          Hover points to inspect fine price projection vectors
                        </p>
                      </div>

                      {/* Legend Controls */}
                      <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
                          <span className="text-[9px] font-mono tracking-widest font-bold text-on-surface uppercase">HISTORIS</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-secondary rounded-full"></span>
                          <span className="text-[9px] font-mono tracking-widest font-bold text-on-surface uppercase">PREDIKSI AI</span>
                        </div>
                      </div>
                    </div>

                    {/* Chart Container Canvas */}
                    <div className="relative w-full overflow-x-auto min-h-[240px]">
                      {predictionData ? (
                        <svg
                          width="100%"
                          height={chartHeight}
                          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                          className="mx-auto"
                        >
                          <defs>
                            <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.06} />
                              <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line
                            x1={paddingLeft}
                            y1={paddingTop}
                            x2={chartWidth - paddingRight}
                            y2={paddingTop}
                            stroke="rgba(26,26,26,0.06)"
                            strokeWidth={1}
                            strokeDasharray="4,4"
                          />
                          <line
                            x1={paddingLeft}
                            y1={(chartHeight - paddingBottom + paddingTop) / 2}
                            x2={chartWidth - paddingRight}
                            y2={(chartHeight - paddingBottom + paddingTop) / 2}
                            stroke="rgba(26,26,26,0.06)"
                            strokeWidth={1}
                            strokeDasharray="4,4"
                          />
                          <line
                            x1={paddingLeft}
                            y1={chartHeight - paddingBottom}
                            x2={chartWidth - paddingRight}
                            y2={chartHeight - paddingBottom}
                            stroke="rgba(26,26,26,0.12)"
                            strokeWidth={1.2}
                          />

                          {/* Zero / Left vertical baseline */}
                          <line
                            x1={paddingLeft}
                            y1={paddingTop}
                            x2={paddingLeft}
                            y2={chartHeight - paddingBottom}
                            stroke="rgba(26,26,26,0.12)"
                            strokeWidth={1.2}
                          />

                          {/* Horizontal Area Fill */}
                          <path
                            d={getAreaPath()}
                            fill="url(#chartFill)"
                          />

                          {/* Historical Price Path Line */}
                          <path
                            d={getHistoricalPath()}
                            fill="none"
                            stroke="#1a1a1a"
                            strokeWidth={2}
                            strokeLinecap="round"
                          />

                          {/* Model Prediction Path Line (Dashed) */}
                          <path
                            d={getPredictionPath()}
                            fill="none"
                            stroke="#a83737"
                            strokeWidth={2.5}
                            strokeDasharray="5,3"
                            strokeLinecap="round"
                          />                           {/* Interactive Coordinate Plot Dots */}
                          {points.map((p, index) => (
                            <g key={index}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={hoveredChartPoint?.date === p.date ? 6 : 3.5}
                                fill={p.isPrediction ? "#a83737" : "#1a1a1a"}
                                stroke="white"
                                strokeWidth={1.5}
                                className="cursor-pointer transition-all duration-150"
                                onMouseEnter={() =>
                                  setHoveredChartPoint({
                                    date: p.date,
                                    price: p.price,
                                    isPrediction: p.isPrediction,
                                    x: p.x,
                                    y: p.y,
                                  })
                                }
                                onMouseLeave={() => setHoveredChartPoint(null)}
                              />
                            </g>
                          ))}

                          {/* Vertical Axis Reference Labels */}
                          <text
                            x={paddingLeft - 10}
                            y={paddingTop + 4}
                            textAnchor="end"
                            fill="rgba(26,26,26,0.6)"
                            className="font-mono text-[9px] font-bold"
                          >
                            Rp {(Math.max(...points.map(p => p.price)) * 1.05 / 1000).toFixed(0)}K
                          </text>
                          <text
                            x={paddingLeft - 10}
                            y={(chartHeight - paddingBottom + paddingTop) / 2 + 4}
                            textAnchor="end"
                            fill="rgba(26,26,26,0.6)"
                            className="font-mono text-[9px] font-bold"
                          >
                            Rp {( (Math.max(...points.map(p => p.price)) + Math.min(...points.map(p => p.price))) / 2000 ).toFixed(0)}K
                          </text>
                          <text
                            x={paddingLeft - 10}
                            y={chartHeight - paddingBottom + 4}
                            textAnchor="end"
                            fill="rgba(26,26,26,0.6)"
                            className="font-mono text-[9px] font-bold"
                          >
                            Rp {(Math.min(...points.map(p => p.price)) * 0.95 / 1000).toFixed(0)}K
                          </text>

                          {/* Horizontal Axis References */}
                          <text
                            x={paddingLeft}
                            y={chartHeight - paddingBottom + 20}
                            textAnchor="middle"
                            fill="rgba(26,26,26,0.6)"
                            className="font-mono text-[9px] font-bold"
                          >
                            T-7
                          </text>
                          <text
                            x={points.find(p => p.date === "Hari Ini")?.x || (chartWidth / 2)}
                            y={chartHeight - paddingBottom + 20}
                            textAnchor="middle"
                            fill="#a83737"
                            className="font-mono text-[10px] font-extrabold uppercase"
                          >
                            HARI INI
                          </text>
                          <text
                            x={chartWidth - paddingRight}
                            y={chartHeight - paddingBottom + 20}
                            textAnchor="middle"
                            fill="rgba(26,26,26,0.6)"
                            className="font-mono text-[9px] font-bold"
                          >
                            T+7
                          </text>
                        </svg>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-on-surface-variant font-mono text-xs">
                          Mempersiapkan database grafik...
                        </div>
                      )}

                      {/* Interactive Hover Tooltip */}
                      {hoveredChartPoint && (
                        <div
                          style={{
                            position: "absolute",
                            left: `${hoveredChartPoint.x - 70}px`,
                            top: `${hoveredChartPoint.y - 75}px`,
                          }}
                          className="bg-[#1a1a1a] text-[#F4F1EA] px-3 py-2 rounded-none shadow-none border border-primary/20 z-30 font-sans text-[11px] text-center pointer-events-none min-w-[140px] transition-all"
                        >
                          <p className="font-mono text-[8px] text-[#F4F1EA]/60 uppercase tracking-[0.2em]">
                            {hoveredChartPoint.isPrediction ? "RAMALAN MODEL" : "DATA AKTUAL"}
                          </p>
                          <p className="font-sans text-xs text-white mt-1 font-light">{hoveredChartPoint.date}</p>
                          <p className="text-[#F4F1EA] font-mono text-xs font-bold mt-0.5">
                            Rp {hoveredChartPoint.price.toLocaleString("id-ID")} /kg
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Prediction Narrative Box */}
                  <div className="bg-[#EBE7DF]/40 border border-primary/10 p-8 rounded-none flex flex-col sm:flex-row gap-6 items-start">
                    <div className="bg-white border border-primary/10 text-primary p-3 rounded-full flex-shrink-0 flex items-center justify-center">
                      <Brain className="w-5 h-5" />
                    </div>
                    <div className="space-y-3.5 flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-serif text-2xl font-normal text-on-surface">
                          Analisis &amp; Prospeksi AI
                        </h3>
                        <span className="border border-primary/25 text-primary text-[9px] font-mono tracking-widest font-bold px-2 py-0.5 uppercase">
                          Sistem AgroVista
                        </span>
                      </div>

                      {isPredicting ? (
                        <div className="space-y-2 py-2 w-full">
                          <div className="h-3 bg-primary/10 w-5/6 animate-pulse" />
                          <div className="h-3 bg-primary/10 w-full animate-pulse" />
                          <div className="h-3 bg-primary/10 w-4/6 animate-pulse" />
                        </div>
                      ) : (
                        <p className="text-[#1a1a1a]/85 font-light text-sm sm:text-base leading-relaxed">
                          {predictionData?.aiInterpretation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Interaction Sliders & Metrics Summary */}
                <div className="md:col-span-4 space-y-6">

                  {/* SLIDERS INPUT BOARD */}
                  <div className="bg-white border border-primary/10 rounded-none p-6">
                    <div className="flex items-center gap-2 border-b border-primary/10 pb-4 mb-5">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                      <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface">
                        VARIABEL INPUT MODEL
                      </h2>
                    </div>

                    <div className="space-y-6">
                      {/* Temperatura */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-on-surface-variant uppercase font-mono text-[10px]">Temperatur Udara</span>
                          <span className="font-mono font-extrabold text-sm text-primary">{inputs.temperature.toFixed(1)}°C</span>
                        </div>
                        <input
                          type="range"
                          min="15.0"
                          max="40.0"
                          step="0.1"
                          value={inputs.temperature}
                          onChange={(e) => handleInputChange("temperature", parseFloat(e.target.value))}
                          className="w-full accent-primary bg-surface-container h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-on-surface-variant/70">
                          <span>15°C</span>
                          <span>Hawa Normal (27°C)</span>
                          <span>40°C</span>
                        </div>
                      </div>

                      {/* Curah Hujan */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-on-surface-variant uppercase font-mono text-[10px]">Volume Curah Hujan</span>
                          <span className="font-mono font-extrabold text-sm text-primary">{inputs.rainfall.toFixed(1)}mm</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="50.0"
                          step="0.5"
                          value={inputs.rainfall}
                          onChange={(e) => handleInputChange("rainfall", parseFloat(e.target.value))}
                          className="w-full accent-primary bg-surface-container h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-on-surface-variant/70">
                          <span>Kering (0mm)</span>
                          <span>Sedang</span>
                          <span>Hujan Lebat (50mm)</span>
                        </div>
                      </div>

                      {/* USD Rates */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-on-surface uppercase font-mono text-[10px] tracking-wide">Nilai Tukar USD / IDR</span>
                          <span className="font-mono font-bold text-xs text-primary">Rp {inputs.usdIdr.toLocaleString("id-ID")}</span>
                        </div>
                        <input
                          type="range"
                          min="14000"
                          max="16500"
                          step="10"
                          value={inputs.usdIdr}
                          onChange={(e) => handleInputChange("usdIdr", parseInt(e.target.value))}
                          className="w-full accent-primary bg-[#EBE7DF] h-1 rounded-none appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] font-mono tracking-wider uppercase text-on-surface-variant/70">
                          <span>Rp 14.000</span>
                          <span>Normal</span>
                          <span>Rp 16.500</span>
                        </div>
                      </div>

                      {/* Inflation Percentage */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-on-surface uppercase font-mono text-[10px] tracking-wide">Inflasi Regional</span>
                          <span className="font-mono font-bold text-xs text-primary">{inputs.inflation.toFixed(1)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="10.0"
                          step="0.1"
                          value={inputs.inflation}
                          onChange={(e) => handleInputChange("inflation", parseFloat(e.target.value))}
                          className="w-full accent-primary bg-[#EBE7DF] h-1 rounded-none appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Season select selector */}
                      <div className="flex flex-col gap-2.5 pt-5 border-t border-primary/10">
                        <span className="font-medium text-on-surface uppercase font-mono text-[10px] tracking-wide">Status Siklus Musiman</span>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleInputChange("season", "hujan")}
                            className={`py-3 px-4 rounded-none text-[10px] font-mono uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold ${
                              inputs.season === "hujan"
                                ? "bg-primary text-[#F4F1EA] border-primary"
                                : "bg-white text-on-surface/60 border-primary/10 hover:bg-[#EBE7DF]/30"
                            }`}
                          >
                            <CloudRain className="w-3.5 h-3.5" />
                            Hujan
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange("season", "kemarau")}
                            className={`py-3 px-4 rounded-none text-[10px] font-mono uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold ${
                              inputs.season === "kemarau"
                                ? "bg-primary text-[#F4F1EA] border-primary"
                                : "bg-white text-on-surface/60 border-primary/10 hover:bg-[#EBE7DF]/30"
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Kemarau
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD METRIC: PREDIKSI HARGA BESOK */}
                  <div className="bg-white border border-primary/10 rounded-none p-6">
                    <p className="font-mono text-[10px] font-bold text-on-surface uppercase tracking-[0.2em] mb-4">
                      PREDIKSI HARI ESOK (H+1)
                    </p>
                    {predictionData ? (
                      <div className="space-y-4">
                        <div className="flex items-baseline gap-1 bg-[#EBE7DF]/30 p-4 border border-primary/5">
                          <span className="font-serif text-3xl lg:text-4xl font-normal text-on-surface tracking-tight">
                            Rp {predictionData.tomorrowPrice.toLocaleString("id-ID")}
                          </span>
                          <span className="text-on-surface-variant font-mono text-[10px] font-bold uppercase tracking-wider">/kg</span>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block text-[9px] uppercase font-mono font-bold tracking-widest px-2.5 py-1 rounded-none ${
                            predictionData.percentageChange >= 0
                              ? "bg-secondary text-white"
                              : "bg-[#1a1a1a] text-[#F4F1EA]"
                          }`}>
                            {predictionData.percentageChange >= 0 ? "+" : ""}
                            {predictionData.percentageChange}% vs Rata-Rata Histori
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-10 bg-[#EBE7DF]/30 animate-pulse" />
                    )}
                  </div>

                  {/* CARD METRIC: PERSENTASE PERUBAHAN */}
                  <div className="bg-white border border-primary/10 rounded-none p-6">
                    <p className="font-mono text-[10px] font-bold text-on-surface uppercase tracking-[0.2em] mb-4">
                      PERSENTASE PERUBAHAN TREN
                    </p>
                    {predictionData ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          {predictionData.percentageChange >= 0 ? (
                            <TrendingUp className="w-5 h-5 text-secondary" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-primary" />
                          )}
                          <span className={`font-serif text-2xl font-light ${
                            predictionData.percentageChange >= 0 ? "text-secondary font-semibold" : "text-primary font-bold"
                          }`}>
                            {predictionData.percentageChange >= 0 ? "+" : ""}
                            {predictionData.percentageChange}%
                          </span>
                          <span className="text-on-surface-variant font-mono text-[8.5px] uppercase tracking-wider ml-auto font-bold/60">Komparasi Rata-rata</span>
                        </div>
                        {/* Progress visual bar */}
                        <div className="bg-[#EBE7DF] h-1.5 rounded-none overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, Math.max(10, Math.abs(predictionData.percentageChange) * 10))}%` }}
                            className={`h-full rounded-none transition-all duration-500 ${
                              predictionData.percentageChange >= 0 ? "bg-secondary" : "bg-primary"
                            }`}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="h-10 bg-[#EBE7DF]/40 animate-pulse" />
                    )}
                  </div>

                  {/* CARD METRIC: MODEL RELIABILITY */}
                  <div className="bg-white border border-primary/10 rounded-none p-6">
                    <p className="font-mono text-[10px] font-bold text-on-surface uppercase tracking-[0.2em] mb-4">
                      MODEL INTEGRITY INDEX
                    </p>
                    <div className="flex items-center gap-5">
                      {/* Animated radial status arc */}
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            className="text-primary/5"
                            cx="24"
                            cy="24"
                            r="21"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="3.5"
                          />
                          <circle
                            className="text-primary"
                            cx="24"
                            cy="24"
                            r="21"
                            fill="transparent"
                            stroke="currentColor"
                            strokeDasharray="131"
                            strokeDashoffset={131 - (131 * (predictionData?.reliability || 94.8)) / 100}
                            strokeWidth="3.5"
                            strokeLinecap="square"
                          />
                        </svg>
                        <span className="absolute font-mono text-[10px] font-bold text-on-surface">
                          {predictionData?.reliability || "94"}%
                        </span>
                      </div>

                      <div>
                        <p className="font-serif text-lg font-normal text-on-surface">
                          {predictionData?.reliability || "94.8"}% Reliability
                        </p>
                        <p className="font-mono text-[8px] uppercase tracking-widest font-bold text-on-surface/45">
                          ACTIVE HYPERPARAMETERS
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Polish footer panel */}
      <footer className="bg-[#EBE7DF] border-t border-primary/10 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 py-10 w-full max-w-7xl mx-auto gap-8">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-none bg-primary flex items-center justify-center text-[#F4F1EA] border border-primary/10">
              <Sprout className="w-5 h-5 text-[#F4F1EA]" />
            </div>
            <div>
              <div className="font-serif text-sm tracking-wide text-primary leading-none uppercase italic">
                AGROVISTA SULAWESI
              </div>
              <p className="font-sans text-[10px] text-on-surface-variant font-light mt-1">
                © 2026 AgroVista Sulawesi. Real-time agricultural decision engine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-[10px] font-mono uppercase tracking-widest text-[#1a1a1a]/70 font-bold">
            <a className="hover:text-primary transition-all cursor-pointer" href="#sumber-data">
              Data Provenance
            </a>
            <span className="opacity-20">|</span>
            <a className="hover:text-primary transition-all cursor-pointer" href="#sumber-data">
              Methodology
            </a>
            <span className="opacity-20">|</span>
            <a className="hover:text-primary transition-all cursor-pointer" href="#sumber-data">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
