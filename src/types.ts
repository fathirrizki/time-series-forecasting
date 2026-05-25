export interface PredictionInput {
  temperature: number; // in Celsius, e.g., 27.4
  rainfall: number;    // in mm, e.g., 12.5
  usdIdr: number;      // e.g., 15680
  inflation: number;   // in percentage, e.g., 3.1
  season: 'hujan' | 'kemarau';
}

export interface PricePoint {
  date: string;
  price: number;
  isPrediction: boolean;
}

export interface PredictionResponse {
  inputs: PredictionInput;
  historicalPrices: PricePoint[];
  predictedPrices: PricePoint[];
  tomorrowPrice: number;
  percentageChange: number;
  reliability: number;
  aiInterpretation: string;
}

export interface DatasetItem {
  tanggal: string;
  harga: number;
  status: 'STABIL' | 'NAIK' | 'TURUN';
}
