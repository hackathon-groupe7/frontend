import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { DEFAULT_CARBON_INPUTS } from './carbon-defaults';
import { CarbonCalculatorService } from './carbon-calculator.service';
import { CarbonInputs, CarbonSnapshot } from './carbon-types';

const STORAGE_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class CarbonHistoryService {
  private readonly auth = inject(AuthService);
  private readonly calculator = inject(CarbonCalculatorService);

  private readonly historySignal = signal<readonly CarbonSnapshot[]>([]);

  readonly history = computed(() => this.historySignal());

  readonly latest = computed(() => {
    const items = this.historySignal();
    return items.length > 0 ? items[items.length - 1] : null;
  });

  readonly storageKey = computed(() => {
    const email = this.auth.getRememberedEmail();
    const scope = email?.trim().toLowerCase() || 'anonymous';
    return `carbon_history_v${STORAGE_VERSION}:${scope}`;
  });

  constructor() {
    effect(() => {
      const key = this.storageKey();
      const loaded = this.readFromStorage(key);
      untracked(() => this.historySignal.set(loaded));
    });

    effect(() => {
      const key = this.storageKey();
      const items = this.historySignal();
      try {
        localStorage.setItem(key, JSON.stringify(items));
      } catch {
        // Ignore persistence errors (e.g. private mode/quota)
      }
    });
  }

  addSnapshot(inputs: CarbonInputs): void {
    const result = this.calculator.calculate(inputs);

    const snapshot: CarbonSnapshot = {
      id: this.newId(),
      createdAtIso: new Date().toISOString(),
      inputs,
      result
    };

    this.historySignal.update((items) => [...items, snapshot]);
  }

  resetToExample(): void {
    this.historySignal.set([]);
    this.addSnapshot(DEFAULT_CARBON_INPUTS);
  }

  private readFromStorage(key: string): CarbonSnapshot[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return [];
      }

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((x): x is CarbonSnapshot => this.isSnapshot(x));
    } catch {
      return [];
    }
  }

  private isSnapshot(value: unknown): value is CarbonSnapshot {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const v = value as Partial<CarbonSnapshot>;
    return typeof v.id === 'string' && typeof v.createdAtIso === 'string' && !!v.inputs && !!v.result;
  }

  private newId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}
