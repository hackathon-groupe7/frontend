import { computed, inject, Injectable } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { RESOURCES } from '../resources/resource-definitions';

type ResourceSnapshot = {
  key: string;
  label: string;
  unit: string;
  consumption: number;
  target: number;
  unitCost: number;
  monthlyCost: number;
  monthlyTargetCost: number;
  isOverTarget: boolean;
};

export type AccountStatsSnapshot = {
  email: string | null;
  months: readonly string[];
  totalMonthlyCostSeries: readonly number[];
  totalMonthlyTargetCostSeries: readonly number[];
  resourceCostShare: readonly { label: string; monthlyCost: number }[];
  current: {
    totalMonthlyCost: number;
    totalMonthlyTargetCost: number;
    overTargetCount: number;
    perResource: readonly ResourceSnapshot[];
  };
};

@Injectable({ providedIn: 'root' })
export class AccountStatsService {
  private readonly auth = inject(AuthService);

  readonly snapshot = computed<AccountStatsSnapshot>(() => {
    const email = this.auth.getRememberedEmail();
    const seed = email ?? 'anonymous';

    const months = this.buildMonthLabels(6);

    const perResourceSeries = RESOURCES.map((resource) => {
      const baseMonthlyCost = resource.defaultValue.consumption * resource.defaultValue.unitCost;
      const baseMonthlyTargetCost = resource.defaultValue.target * resource.defaultValue.unitCost;

      const monthlyCosts = months.map((_m, idx) => {
        const jitter = this.seededFactor(`${seed}:${resource.key}:${idx}`);
        return Math.max(0, baseMonthlyCost * jitter);
      });

      const monthlyTargetCosts = months.map((_m, idx) => {
        const jitter = this.seededFactor(`${seed}:target:${resource.key}:${idx}`);
        return Math.max(0, baseMonthlyTargetCost * jitter);
      });

      return {
        resource,
        monthlyCosts,
        monthlyTargetCosts
      };
    });

    const totalMonthlyCostSeries = months.map((_m, idx) =>
      perResourceSeries.reduce((sum, series) => sum + series.monthlyCosts[idx], 0)
    );

    const totalMonthlyTargetCostSeries = months.map((_m, idx) =>
      perResourceSeries.reduce((sum, series) => sum + series.monthlyTargetCosts[idx], 0)
    );

    const currentPerResource: ResourceSnapshot[] = RESOURCES.map((resource) => {
      const consumption = resource.defaultValue.consumption;
      const target = resource.defaultValue.target;
      const unitCost = resource.defaultValue.unitCost;
      const monthlyCost = consumption * unitCost;
      const monthlyTargetCost = target * unitCost;

      return {
        key: resource.key,
        label: resource.label,
        unit: resource.unit,
        consumption,
        target,
        unitCost,
        monthlyCost,
        monthlyTargetCost,
        isOverTarget: target > 0 && consumption > target
      };
    });

    const totalMonthlyCost = currentPerResource.reduce((sum, r) => sum + r.monthlyCost, 0);
    const totalMonthlyTargetCost = currentPerResource.reduce(
      (sum, r) => sum + r.monthlyTargetCost,
      0
    );
    const overTargetCount = currentPerResource.reduce(
      (sum, r) => (r.isOverTarget ? sum + 1 : sum),
      0
    );

    const resourceCostShare = currentPerResource.map((r) => ({
      label: r.label,
      monthlyCost: r.monthlyCost
    }));

    return {
      email,
      months,
      totalMonthlyCostSeries,
      totalMonthlyTargetCostSeries,
      resourceCostShare,
      current: {
        totalMonthlyCost,
        totalMonthlyTargetCost,
        overTargetCount,
        perResource: currentPerResource
      }
    };
  });

  private buildMonthLabels(count: number): readonly string[] {
    const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
    const now = new Date();

    const months: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = formatter.format(d);
      months.push(label.charAt(0).toUpperCase() + label.slice(1));
    }

    return months;
  }

  private seededFactor(key: string): number {
    const h = this.hashString(key);
    const normalized = (h % 1000) / 1000;
    return 0.9 + normalized * 0.25;
  }

  private hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }

    return Math.abs(hash);
  }
}
