export type ResourceFormValue = {
  consumption: number;
  target: number;
  unitCost: number;
};

export type ResourceDefinition = {
  key: 'electricity' | 'water' | 'gas' | 'waste';
  label: string;
  unit: string;
  consumptionMax: number;
  targetMax: number;
  step: number;
  defaultValue: ResourceFormValue;
};

export const RESOURCES: readonly ResourceDefinition[] = [
  {
    key: 'electricity',
    label: 'Électricité',
    unit: 'kWh',
    consumptionMax: 25000,
    targetMax: 25000,
    step: 50,
    defaultValue: { consumption: 6800, target: 7500, unitCost: 0.22 }
  },
  {
    key: 'water',
    label: 'Eau',
    unit: 'm³',
    consumptionMax: 1200,
    targetMax: 1200,
    step: 5,
    defaultValue: { consumption: 180, target: 200, unitCost: 4.0 }
  },
  {
    key: 'gas',
    label: 'Gaz',
    unit: 'kWh',
    consumptionMax: 40000,
    targetMax: 40000,
    step: 100,
    defaultValue: { consumption: 12500, target: 12000, unitCost: 0.11 }
  },
  {
    key: 'waste',
    label: 'Déchets',
    unit: 'kg',
    consumptionMax: 10000,
    targetMax: 10000,
    step: 25,
    defaultValue: { consumption: 950, target: 800, unitCost: 0.2 }
  }
] as const;
