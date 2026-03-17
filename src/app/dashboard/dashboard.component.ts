import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { startWith } from 'rxjs';

type ResourceFormValue = {
  consumption: number;
  target: number;
  unitCost: number;
};

type ResourceDefinition = {
  key: 'electricity' | 'water' | 'gas' | 'waste';
  label: string;
  unit: string;
  consumptionMax: number;
  targetMax: number;
  step: number;
  defaultValue: ResourceFormValue;
};

const RESOURCES: readonly ResourceDefinition[] = [
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

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CurrencyPipe, DecimalPipe],
  template: `
    <div class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-1">
          <h1 class="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard de consommation
          </h1>
          <p class="text-sm text-slate-600">
            Ajustez la consommation, l’objectif et le coût unitaire pour chaque ressource.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            (click)="resetToDefaults()"
          >
            Réinitialiser
          </button>
        </div>
      </header>

      <section
        class="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3"
        aria-label="Synthèse"
      >
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Coût estimé / mois</p>
          <p class="text-2xl font-semibold text-slate-900">
            {{ totals().totalMonthlyCost | currency : 'EUR' : 'symbol' : '1.0-0' }}
          </p>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Ressources au-dessus de l’objectif</p>
          <p class="text-2xl font-semibold text-slate-900">
            {{ totals().overTargetCount | number : '1.0-0' }}
          </p>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Objectif global (coût)</p>
          <p class="text-2xl font-semibold text-slate-900">
            {{ totals().totalMonthlyTargetCost | currency : 'EUR' : 'symbol' : '1.0-0' }}
          </p>
        </div>
      </section>

      <form class="grid grid-cols-1 gap-4 md:grid-cols-2" [formGroup]="form" aria-label="Consommations">
        <div class="sr-only" aria-live="polite">
          Coût estimé total {{ totals().totalMonthlyCost | currency : 'EUR' : 'symbol' : '1.0-0' }}.
        </div>

        <div formArrayName="resources" class="contents">
          @for (resource of resources; track resource.key; let i = $index) {
            <section
              class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              [attr.aria-labelledby]="'resource-title-' + resource.key"
              [formGroupName]="i"
            >
              <header class="flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <h2
                    class="text-base font-semibold text-slate-900"
                    [id]="'resource-title-' + resource.key"
                  >
                    {{ resource.label }}
                  </h2>
                  <p class="text-sm text-slate-600">
                    Unité : <span class="font-medium text-slate-900">{{ resource.unit }}</span>
                  </p>
                </div>

                <div class="flex items-center gap-2 text-sm">
                  @if (totals().perResource[i].isOverTarget) {
                    <span
                      class="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900"
                    >
                      Au-dessus
                    </span>
                  } @else {
                    <span
                      class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900"
                    >
                      OK
                    </span>
                  }
                </div>
              </header>

              <div class="mt-4 space-y-4">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div class="space-y-1">
                    <label
                      class="text-sm font-medium text-slate-900"
                      [for]="'consumption-' + resource.key"
                    >
                      Consommation ({{ resource.unit }})
                    </label>
                    <input
                      class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                      type="number"
                      inputmode="decimal"
                      [id]="'consumption-' + resource.key"
                      formControlName="consumption"
                      [min]="0"
                      [max]="resource.consumptionMax"
                      [step]="resource.step"
                    />
                  </div>

                  <div class="space-y-1">
                    <label
                      class="text-sm font-medium text-slate-900"
                      [for]="'target-' + resource.key"
                    >
                      Objectif ({{ resource.unit }})
                    </label>
                    <input
                      class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                      type="number"
                      inputmode="decimal"
                      [id]="'target-' + resource.key"
                      formControlName="target"
                      [min]="0"
                      [max]="resource.targetMax"
                      [step]="resource.step"
                    />
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between gap-3">
                    <label
                      class="text-sm font-medium text-slate-900"
                      [for]="'range-' + resource.key"
                    >
                      Ajuster rapidement
                    </label>
                    <span class="text-sm tabular-nums text-slate-700">
                      {{ totals().perResource[i].consumption | number : '1.0-0' }} / {{
                        totals().perResource[i].target | number : '1.0-0'
                      }}
                      {{ resource.unit }}
                    </span>
                  </div>
                  <input
                    class="h-2 w-full cursor-pointer accent-slate-900"
                    type="range"
                    [id]="'range-' + resource.key"
                    [min]="0"
                    [max]="resource.consumptionMax"
                    [step]="resource.step"
                    [value]="totals().perResource[i].consumption"
                    (input)="onRangeInput(i, $event)"
                    [attr.aria-describedby]="'range-help-' + resource.key"
                  />
                  <p class="text-xs text-slate-600" [id]="'range-help-' + resource.key">
                    Le slider modifie uniquement la consommation.
                  </p>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div class="space-y-1">
                    <label
                      class="text-sm font-medium text-slate-900"
                      [for]="'unitCost-' + resource.key"
                    >
                      Coût unitaire (€/{{ resource.unit }})
                    </label>
                    <input
                      class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                      type="number"
                      inputmode="decimal"
                      [id]="'unitCost-' + resource.key"
                      formControlName="unitCost"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div class="space-y-1">
                    <p class="text-sm font-medium text-slate-900">Coût estimé</p>
                    <p class="text-lg font-semibold tabular-nums text-slate-900">
                      {{ totals().perResource[i].monthlyCost | currency : 'EUR' : 'symbol' : '1.0-0' }}
                    </p>
                    <p class="text-xs text-slate-600">
                      Objectif :
                      {{ totals().perResource[i].monthlyTargetCost | currency : 'EUR' : 'symbol' : '1.0-0' }}
                    </p>
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between text-sm">
                    <p class="font-medium text-slate-900">Progression</p>
                    <p class="tabular-nums text-slate-700">
                      {{ totals().perResource[i].progressPercent | number : '1.0-0' }}%
                    </p>
                  </div>
                  <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div
                      class="h-full"
                      [class]="totals().perResource[i].isOverTarget
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'"
                      [style.width.%]="totals().perResource[i].progressBarWidth"
                    ></div>
                  </div>
                </div>
              </div>
            </section>
          }
        </div>
      </form>
    </div>
  `
})
export class DashboardComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly resources = RESOURCES;

  protected readonly resourcesArray = this.fb.array(
    this.resources.map((r) => this.createResourceGroup(r)),
    { validators: [Validators.required] }
  );

  protected readonly form = this.fb.group({
    resources: this.resourcesArray
  });

  private readonly resourcesValue = toSignal(
    this.resourcesArray.valueChanges.pipe(startWith(this.resourcesArray.getRawValue())),
    { initialValue: this.resourcesArray.getRawValue() }
  );

  protected readonly totals = computed(() => {
    const values = this.resourcesValue();

    const perResource = values.map((value, index) => {
      const def = this.resources[index];
      const consumption = this.sanitizeNumber(value.consumption);
      const target = this.sanitizeNumber(value.target);
      const unitCost = this.sanitizeNumber(value.unitCost);
      const monthlyCost = consumption * unitCost;
      const monthlyTargetCost = target * unitCost;
      const progressRaw = target > 0 ? (consumption / target) * 100 : 0;
      const progressPercent = Math.max(0, progressRaw);
      const progressBarWidth = Math.min(100, progressPercent);
      const isOverTarget = target > 0 && consumption > target;

      return {
        key: def.key,
        consumption,
        target,
        unitCost,
        monthlyCost,
        monthlyTargetCost,
        progressPercent,
        progressBarWidth,
        isOverTarget
      };
    });

    const totalMonthlyCost = perResource.reduce((sum, r) => sum + r.monthlyCost, 0);
    const totalMonthlyTargetCost = perResource.reduce((sum, r) => sum + r.monthlyTargetCost, 0);
    const overTargetCount = perResource.reduce(
      (sum, r) => (r.isOverTarget ? sum + 1 : sum),
      0
    );

    return {
      perResource,
      totalMonthlyCost,
      totalMonthlyTargetCost,
      overTargetCount
    };
  });

  protected onRangeInput(index: number, event: Event): void {
    const target = event.target;
    const value = target instanceof HTMLInputElement ? target.valueAsNumber : 0;
    this.setConsumption(index, value);
  }

  private setConsumption(index: number, rawValue: unknown): void {
    const value = this.sanitizeNumber(rawValue);
    const group = this.resourcesArray.at(index);
    group.controls.consumption.setValue(value);
  }

  protected resetToDefaults(): void {
    this.resourcesArray.controls.forEach((group, index) => {
      group.setValue(this.resources[index].defaultValue);
    });
  }

  private createResourceGroup(resource: ResourceDefinition) {
    return this.fb.group({
      consumption: this.fb.control(resource.defaultValue.consumption, {
        validators: [Validators.min(0), Validators.max(resource.consumptionMax)]
      }),
      target: this.fb.control(resource.defaultValue.target, {
        validators: [Validators.min(0), Validators.max(resource.targetMax)]
      }),
      unitCost: this.fb.control(resource.defaultValue.unitCost, {
        validators: [Validators.min(0)]
      })
    });
  }

  private sanitizeNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }
}