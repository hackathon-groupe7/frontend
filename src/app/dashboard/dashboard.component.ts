import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { startWith } from 'rxjs';

import { RESOURCES, ResourceDefinition } from '../resources/resource-definitions';

// Resource definitions are shared with other views (e.g. Account stats).

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CurrencyPipe, DecimalPipe],
  template: `
    <div
      class="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6"
      aria-label="Dashboard"
    >
      <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          class="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl"
        ></div>
        <div
          class="absolute -right-24 top-24 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl"
        ></div>
        <div
          class="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-white/70 via-slate-50/40 to-transparent"
        ></div>
      </div>

      <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-1">
          <h1 class="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
          <p class="text-sm text-slate-600">
            Pilotez vos ressources comme un petit territoire : la plaine (sobriété) et la ville
            (activité) doivent rester en équilibre.
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
        class="overflow-hidden rounded-xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur"
        aria-label="Illustration ludique"
      >
        <div class="grid grid-cols-1 gap-0 sm:grid-cols-2">
          <div class="flex flex-col gap-2 p-5">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Scène</p>
            <p class="text-sm text-slate-700">
              Une lecture rapide :
              <span class="font-medium text-slate-900">plaine</span> = objectifs,
              <span class="font-medium text-slate-900">immeubles</span> = consommation.
            </p>
            <p class="text-xs text-slate-600">
              Astuce : utilisez les sliders pour tester des scénarios.
            </p>
          </div>

          <div class="border-t border-slate-200 bg-linear-to-br from-emerald-50 via-white to-amber-50 sm:border-l sm:border-t-0">
            <svg
              class="h-40 w-full"
              viewBox="0 0 900 260"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <!-- horizon -->
              <path
                d="M20 170 C120 120, 220 210, 320 160 C420 110, 520 210, 620 165 C720 120, 800 155, 880 140"
                class="text-slate-900"
                stroke="currentColor"
                stroke-opacity="0.25"
                stroke-width="3"
                stroke-linecap="round"
              />

              <!-- plains (left) -->
              <g class="text-emerald-700">
                <path
                  d="M40 210 C100 180, 160 235, 220 205 C280 175, 330 220, 390 200"
                  stroke="currentColor"
                  stroke-opacity="0.6"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <path
                  d="M60 230 C120 205, 175 250, 240 225 C305 200, 350 245, 420 220"
                  stroke="currentColor"
                  stroke-opacity="0.35"
                  stroke-width="3"
                  stroke-linecap="round"
                />

                <!-- small windmill -->
                <path
                  d="M170 120 L170 200"
                  stroke="currentColor"
                  stroke-opacity="0.65"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <path
                  d="M170 140 L135 125"
                  stroke="currentColor"
                  stroke-opacity="0.65"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <path
                  d="M170 140 L205 125"
                  stroke="currentColor"
                  stroke-opacity="0.65"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <path
                  d="M170 140 L150 165"
                  stroke="currentColor"
                  stroke-opacity="0.65"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <path
                  d="M170 140 L190 165"
                  stroke="currentColor"
                  stroke-opacity="0.65"
                  stroke-width="3"
                  stroke-linecap="round"
                />
              </g>

              <!-- buildings (right) -->
              <g class="text-amber-700">
                <rect
                  x="560"
                  y="95"
                  width="64"
                  height="120"
                  rx="6"
                  stroke="currentColor"
                  stroke-opacity="0.65"
                  stroke-width="3"
                />
                <rect
                  x="640"
                  y="60"
                  width="78"
                  height="155"
                  rx="6"
                  stroke="currentColor"
                  stroke-opacity="0.65"
                  stroke-width="3"
                />
                <rect
                  x="734"
                  y="110"
                  width="52"
                  height="105"
                  rx="6"
                  stroke="currentColor"
                  stroke-opacity="0.65"
                  stroke-width="3"
                />
                <path
                  d="M550 215 H805"
                  stroke="currentColor"
                  stroke-opacity="0.3"
                  stroke-width="3"
                  stroke-linecap="round"
                />

                <!-- simple windows -->
                <path
                  d="M578 118 H606 M578 140 H606 M578 162 H606 M578 184 H606"
                  stroke="currentColor"
                  stroke-opacity="0.22"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <path
                  d="M660 86 H700 M660 108 H700 M660 130 H700 M660 152 H700 M660 174 H700"
                  stroke="currentColor"
                  stroke-opacity="0.22"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <path
                  d="M748 132 H772 M748 154 H772 M748 176 H772"
                  stroke="currentColor"
                  stroke-opacity="0.22"
                  stroke-width="3"
                  stroke-linecap="round"
                />
              </g>
            </svg>
          </div>
        </div>
      </section>

      <section
        class="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur sm:grid-cols-3"
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
              class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur"
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