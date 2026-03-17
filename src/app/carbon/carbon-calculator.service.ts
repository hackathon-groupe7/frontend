import { Injectable } from '@angular/core';

import {
  CarbonCategoryKey,
  CarbonCategoryResult,
  CarbonInputs,
  CarbonResult
} from './carbon-types';

const CATEGORY_LABELS: Record<CarbonCategoryKey, string> = {
  building: 'Bâtiments',
  materials: 'Matériaux',
  parking: 'Parking',
  energy: 'Énergie',
  operations: 'Exploitation'
};

@Injectable({ providedIn: 'root' })
export class CarbonCalculatorService {
  calculate(inputs: CarbonInputs): CarbonResult {
    const surfaceAreaM2 = this.sanitizeNonNegative(inputs.surfaceAreaM2);

    const amortizationYears = this.sanitizePositiveOrZero(inputs.building.amortizationYears);
    const buildingKg =
      amortizationYears > 0
        ? this.sanitizeNonNegative(inputs.building.constructionKgCo2eTotal) / amortizationYears
        : 0;

    const materialsKg =
      this.sanitizeNonNegative(inputs.materials.massKg) *
      this.sanitizeNonNegative(inputs.materials.factorKgCo2ePerKg);

    const parkingKg =
      this.sanitizeNonNegative(inputs.parking.annualVehicleKm) *
      this.sanitizeNonNegative(inputs.parking.factorKgCo2ePerKm);

    const energyKg =
      this.sanitizeNonNegative(inputs.energy.electricityKwh) *
        this.sanitizeNonNegative(inputs.energy.electricityFactorKgCo2ePerKwh) +
      this.sanitizeNonNegative(inputs.energy.gasKwh) *
        this.sanitizeNonNegative(inputs.energy.gasFactorKgCo2ePerKwh);

    const operationsKg =
      this.sanitizeNonNegative(inputs.operations.wasteKg) *
        this.sanitizeNonNegative(inputs.operations.wasteFactorKgCo2ePerKg) +
      this.sanitizeNonNegative(inputs.operations.waterM3) *
        this.sanitizeNonNegative(inputs.operations.waterFactorKgCo2ePerM3);

    const rawCategories: Array<Pick<CarbonCategoryResult, 'key' | 'label' | 'kgCo2e'>> = [
      { key: 'building', label: CATEGORY_LABELS.building, kgCo2e: buildingKg },
      { key: 'materials', label: CATEGORY_LABELS.materials, kgCo2e: materialsKg },
      { key: 'parking', label: CATEGORY_LABELS.parking, kgCo2e: parkingKg },
      { key: 'energy', label: CATEGORY_LABELS.energy, kgCo2e: energyKg },
      { key: 'operations', label: CATEGORY_LABELS.operations, kgCo2e: operationsKg }
    ];

    const totalKgCo2e = rawCategories.reduce((sum, c) => sum + c.kgCo2e, 0);
    const totalTCo2e = totalKgCo2e / 1000;

    const categories: CarbonCategoryResult[] = rawCategories.map((c) => {
      const sharePercent = totalKgCo2e > 0 ? (c.kgCo2e / totalKgCo2e) * 100 : 0;
      return {
        ...c,
        tCo2e: c.kgCo2e / 1000,
        sharePercent
      };
    });

    const intensityKgCo2ePerM2 = surfaceAreaM2 > 0 ? totalKgCo2e / surfaceAreaM2 : null;

    return {
      totalKgCo2e,
      totalTCo2e,
      intensityKgCo2ePerM2,
      categories
    };
  }

  private sanitizeNonNegative(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }

    return 0;
  }

  private sanitizePositiveOrZero(value: unknown): number {
    const n = this.sanitizeNonNegative(value);
    return n;
  }
}
