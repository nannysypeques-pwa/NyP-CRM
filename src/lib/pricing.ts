// Tabuladores de Precios y Tarifas determinísticos para Nannys y Peques

interface TariffTable {
  [hours: number]: number;
}

interface CityTariff {
  [days: number]: TariffTable;
}

const TARIFFS: { [city: string]: CityTariff } = {
  PUEBLA: {
    1: { 3: 300, 4: 400, 5: 450, 6: 540, 7: 630, 8: 720, 9: 810, 10: 900 },
    2: { 3: 748, 4: 814, 5: 869, 6: 913, 7: 957, 8: 1012, 9: 1089, 10: 1210 },
    3: { 3: 966, 4: 1080, 5: 1275, 6: 1440, 7: 1575, 8: 1680, 9: 1890, 10: 2100 },
    4: { 3: 1288, 4: 1440, 5: 1700, 6: 1920, 7: 2100, 8: 2240, 9: 2520, 10: 2800 },
    5: { 3: 1610, 4: 1800, 5: 2125, 6: 2400, 7: 2625, 8: 2800, 9: 3150, 10: 3500 },
    6: { 3: 1932, 4: 2160, 5: 2550, 6: 2880, 7: 3150, 8: 3360, 9: 3780, 10: 4200 },
    7: { 3: 2255, 4: 2520, 5: 2975, 6: 3360, 7: 3675, 8: 3920, 9: 4410, 10: 4900 }
  },
  XALAPA: {
    1: { 3: 270, 4: 320, 5: 350, 6: 420, 7: 490, 8: 560, 9: 630, 10: 700 },
    2: { 3: 638, 4: 748, 5: 814, 6: 869, 7: 913, 8: 957, 9: 1012, 10: 1089 },
    3: { 3: 851, 4: 966, 5: 1088, 6: 1243, 7: 1334, 8: 1418, 9: 1596, 10: 1773 },
    4: { 3: 1134, 4: 1288, 5: 1451, 6: 1657, 7: 1778, 8: 1891, 9: 2128, 10: 2364 },
    5: { 3: 1418, 4: 1610, 5: 1814, 6: 2071, 7: 2223, 8: 2364, 9: 2660, 10: 2955 },
    6: { 3: 1701, 4: 1932, 5: 2177, 6: 2486, 7: 2668, 8: 2837, 9: 3192, 10: 3546 },
    7: { 3: 1985, 4: 2255, 5: 2539, 6: 2900, 7: 3112, 8: 3309, 9: 3724, 10: 4136 }
  },
  QUERETARO: {
    1: { 3: 420, 4: 560, 5: 695, 6: 828, 7: 959, 8: 1096, 9: 1233, 10: 1370 },
    2: { 3: 720, 4: 960, 5: 1150, 6: 1380, 7: 1540, 8: 1600, 9: 1800, 10: 2000 },
    3: { 3: 946, 4: 1245, 5: 1543, 6: 1737, 7: 1969, 8: 2201, 9: 2467, 10: 2694 },
    4: { 3: 1262, 4: 1660, 5: 2057, 6: 2316, 7: 2626, 8: 2935, 9: 3290, 10: 3592 },
    5: { 3: 1577, 4: 2075, 5: 2572, 6: 2895, 7: 3282, 8: 3668, 9: 4112, 10: 4490 },
    6: { 3: 1893, 4: 2490, 5: 3086, 6: 3474, 7: 3938, 8: 4402, 9: 4935, 10: 5387 },
    7: { 3: 2208, 4: 2904, 5: 3600, 6: 4052, 7: 4595, 8: 5136, 9: 5757, 10: 6285 }
  },
  CDMX: {
    1: { 3: 420, 4: 560, 5: 700, 6: 810, 7: 945, 8: 1040, 9: 1170, 10: 1300 },
    2: { 3: 840, 4: 1120, 5: 1400, 6: 1620, 7: 1890, 8: 2080, 9: 2340, 10: 2600 },
    3: { 3: 990, 4: 1320, 5: 1650, 6: 1800, 7: 2040, 8: 2280, 9: 2565, 10: 2850 },
    4: { 3: 1320, 4: 1760, 5: 2200, 6: 2400, 7: 2720, 8: 3040, 9: 3420, 10: 3800 },
    5: { 3: 1650, 4: 2200, 5: 2750, 6: 3000, 7: 3400, 8: 3800, 9: 4275, 10: 4750 },
    6: { 3: 1980, 4: 2640, 5: 3300, 6: 3600, 7: 4080, 8: 4560, 9: 5130, 10: 5700 },
    7: { 3: 2310, 4: 3080, 5: 3850, 6: 4200, 7: 4760, 8: 5320, 9: 5985, 10: 6650 }
  }
};

export function calculatePrecotizacion(ciudad: string, dias: number, horas: number): number | null {
  if (!ciudad || !dias || !horas || dias <= 0 || horas <= 0) return null;
  
  // Normalizar ciudad
  let normalizedCity = ciudad.toUpperCase().trim();
  if (normalizedCity.includes("PUEBLA") || normalizedCity.includes("ATLIXCO")) {
    normalizedCity = "PUEBLA";
  } else if (normalizedCity.includes("CDMX") || normalizedCity.includes("MÉXICO") || normalizedCity.includes("MEXICO")) {
    normalizedCity = "CDMX";
  } else if (normalizedCity.includes("QUERETARO") || normalizedCity.includes("QUERÉTARO")) {
    normalizedCity = "QUERETARO";
  } else if (normalizedCity.includes("XALAPA") || normalizedCity.includes("JALAPA")) {
    normalizedCity = "XALAPA";
  }

  const cityTable = TARIFFS[normalizedCity];
  if (!cityTable) return null;

  // Normalizar días (1 a 7)
  const normalizedDays = Math.max(1, Math.min(7, Math.round(dias)));
  const daysTable = cityTable[normalizedDays];
  if (!daysTable) return null;

  // Normalizar horas (3 a 10)
  const normalizedHours = Math.max(3, Math.min(10, Math.round(horas)));
  const price = daysTable[normalizedHours];

  return price || null;
}
