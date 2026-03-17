import { computed, inject, Injectable } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { CarbonHistoryService } from '../carbon/carbon-history.service';

type CategorySnapshot = {
  key: string;
  label: string;
  tCo2e: number;
  sharePercent: number;
};

export type AccountStatsSnapshot = {
  email: string | null;
  hasHistory: boolean;
  historyCount: number;
  labels: readonly string[];
  totalSeriesTco2e: readonly number[];
  latest: {
    siteName: string;
    createdAtIso: string;
    totalTco2e: number;
    intensityKgCo2ePerM2: number | null;
    categories: readonly CategorySnapshot[];
  } | null;
};

@Injectable({ providedIn: 'root' })
export class AccountStatsService {
  private readonly auth = inject(AuthService);
  private readonly historyService = inject(CarbonHistoryService);

  readonly snapshot = computed<AccountStatsSnapshot>(() => {
    const email = this.auth.getRememberedEmail();
    const history = this.historyService.history();

    const last = history.length > 0 ? history[history.length - 1] : null;
    const trimmed = history.slice(Math.max(0, history.length - 12));

    const labels = trimmed.map((s) =>
      new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(
        new Date(s.createdAtIso)
      )
    );
    const totalSeriesTco2e = trimmed.map((s) => s.result.totalTCo2e);

    return {
      email,
      hasHistory: history.length > 0,
      historyCount: history.length,
      labels,
      totalSeriesTco2e,
      latest: last
        ? {
            siteName: last.inputs.siteName,
            createdAtIso: last.createdAtIso,
            totalTco2e: last.result.totalTCo2e,
            intensityKgCo2ePerM2: last.result.intensityKgCo2ePerM2,
            categories: last.result.categories.map((c) => ({
              key: c.key,
              label: c.label,
              tCo2e: c.tCo2e,
              sharePercent: c.sharePercent
            }))
          }
        : null
    };
  });
}
