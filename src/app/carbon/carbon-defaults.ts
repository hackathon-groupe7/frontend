import { CarbonInputs } from './carbon-types';

export const DEFAULT_CARBON_INPUTS: CarbonInputs = {
  siteName: 'Mon site',
  period: 'year',
  surfaceAreaM2: 2500,
  building: {
    constructionKgCo2eTotal: 1_250_000,
    amortizationYears: 50
  },
  materials: {
    massKg: 15_000,
    factorKgCo2ePerKg: 2.1
  },
  parking: {
    annualVehicleKm: 180_000,
    factorKgCo2ePerKm: 0.19
  },
  energy: {
    electricityKwh: 320_000,
    electricityFactorKgCo2ePerKwh: 0.055,
    gasKwh: 210_000,
    gasFactorKgCo2ePerKwh: 0.204
  },
  operations: {
    wasteKg: 18_000,
    wasteFactorKgCo2ePerKg: 0.45,
    waterM3: 2_500,
    waterFactorKgCo2ePerM3: 0.34
  }
};
