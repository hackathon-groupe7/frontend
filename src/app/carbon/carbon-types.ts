export type CarbonPeriod = 'year';

export type CarbonInputs = {
  siteName: string;
  period: CarbonPeriod;
  surfaceAreaM2: number;

  building: {
    constructionKgCo2eTotal: number;
    amortizationYears: number;
  };

  materials: {
    massKg: number;
    factorKgCo2ePerKg: number;
  };

  parking: {
    annualVehicleKm: number;
    factorKgCo2ePerKm: number;
  };

  energy: {
    electricityKwh: number;
    electricityFactorKgCo2ePerKwh: number;
    gasKwh: number;
    gasFactorKgCo2ePerKwh: number;
  };

  operations: {
    wasteKg: number;
    wasteFactorKgCo2ePerKg: number;
    waterM3: number;
    waterFactorKgCo2ePerM3: number;
  };
};

export type CarbonCategoryKey = 'building' | 'materials' | 'parking' | 'energy' | 'operations';

export type CarbonCategoryResult = {
  key: CarbonCategoryKey;
  label: string;
  kgCo2e: number;
  tCo2e: number;
  sharePercent: number;
};

export type CarbonResult = {
  totalKgCo2e: number;
  totalTCo2e: number;
  intensityKgCo2ePerM2: number | null;
  categories: readonly CarbonCategoryResult[];
};

export type CarbonSnapshot = {
  id: string;
  createdAtIso: string;
  inputs: CarbonInputs;
  result: CarbonResult;
};
