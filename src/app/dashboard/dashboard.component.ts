import { DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { Chart, type ChartConfiguration } from 'chart.js/auto';

import { DEFAULT_CARBON_INPUTS } from '../carbon/carbon-defaults';
import { CarbonCalculatorService } from '../carbon/carbon-calculator.service';
import { CarbonHistoryService } from '../carbon/carbon-history.service';
import { CarbonInputs } from '../carbon/carbon-types';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DecimalPipe],
  template: `
    <div
      class="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6"
      aria-label="Calculateur d'empreinte carbone"
    >
      <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div class="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl"></div>
        <div class="absolute -right-24 top-24 h-80 w-80 rounded-full bg-sky-200/25 blur-3xl"></div>
        <div
          class="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-white/70 via-slate-50/40 to-transparent"
        ></div>
      </div>

      <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-1">
          <h1 class="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">
            Empreinte carbone — site physique
          </h1>
          <p class="text-sm text-slate-600">
            Saisissez des données réelles (bâtiments, matériaux, parking, énergie, exploitation) pour
            obtenir des indicateurs, des visualisations, et un suivi dans le temps.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            (click)="resetToDefaults()"
          >
            Réinitialiser
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="form.invalid"
            (click)="saveSnapshot()"
          >
            Enregistrer le relevé
          </button>
        </div>
      </header>

      @if (statusMessage()) {
        <p
          class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {{ statusMessage() }}
        </p>
      }

      <section
        class="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur sm:grid-cols-4"
        aria-label="Indicateurs"
      >
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
          <p class="text-2xl font-semibold text-slate-900">
            {{ result().totalTCo2e | number : '1.1-1' }} tCO₂e/an
          </p>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Intensité</p>
          <p class="text-2xl font-semibold text-slate-900">
            @if (result().intensityKgCo2ePerM2 !== null) {
              {{ result().intensityKgCo2ePerM2 | number : '1.0-0' }} kgCO₂e/m²/an
            } @else {
              —
            }
          </p>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Poste dominant</p>
          <p class="text-2xl font-semibold text-slate-900">{{ topCategoryLabel() }}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Écart vs dernier relevé</p>
          <p class="text-2xl font-semibold text-slate-900">
            @if (deltaVsLatestPercent() !== null) {
              {{ deltaVsLatestPercent() | number : '1.0-0' }}%
            } @else {
              —
            }
          </p>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Visualisations">
        <article class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header class="space-y-1">
            <h2 class="text-base font-semibold text-slate-900">Évolution des émissions</h2>
            <p class="text-sm text-slate-600">Basée sur les relevés enregistrés.</p>
          </header>

          <div class="mt-4" aria-label="Graphique d'évolution" role="img">
            @if (history().length === 0) {
              <p class="text-sm text-slate-600">Aucun relevé enregistré pour le moment.</p>
            } @else {
              <div class="relative h-64">
                <canvas #historyCanvas class="absolute inset-0 h-full w-full"></canvas>
              </div>
            }
          </div>
        </article>

        <article class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header class="space-y-1">
            <h2 class="text-base font-semibold text-slate-900">Répartition par poste</h2>
            <p class="text-sm text-slate-600">Répartition sur la saisie courante.</p>
          </header>

          <div class="mt-4" aria-label="Graphique de répartition" role="img">
            <div class="relative h-64">
              <canvas #breakdownCanvas class="absolute inset-0 h-full w-full"></canvas>
            </div>
          </div>
        </article>
      </section>

      <form class="grid grid-cols-1 gap-4" [formGroup]="form" aria-label="Données du site">
        <section class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header class="space-y-1">
            <h2 class="text-base font-semibold text-slate-900">Informations du site</h2>
            <p class="text-sm text-slate-600">Ces champs servent à contextualiser les indicateurs.</p>
          </header>

          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="space-y-1">
              <label class="text-sm font-medium text-slate-900" for="siteName">Nom du site</label>
              <input
                id="siteName"
                class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                type="text"
                autocomplete="organization"
                formControlName="siteName"
              />
            </div>

            <div class="space-y-1">
              <label class="text-sm font-medium text-slate-900" for="surfaceAreaM2">Surface (m²)</label>
              <input
                id="surfaceAreaM2"
                class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                type="number"
                inputmode="decimal"
                min="0"
                step="1"
                formControlName="surfaceAreaM2"
              />
            </div>
          </div>
        </section>

        <section
          class="grid grid-cols-1 gap-4 md:grid-cols-2"
          aria-label="Postes d'émission"
        >
          <article
            class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur"
            formGroupName="building"
          >
            <header class="space-y-1">
              <h2 class="text-base font-semibold text-slate-900">Bâtiments</h2>
              <p class="text-sm text-slate-600">
                Empreinte de construction amortie sur la durée de vie.
              </p>
            </header>

            <div class="mt-4 grid grid-cols-1 gap-3">
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="constructionKgCo2eTotal">
                  Construction (kgCO₂e total)
                </label>
                <input
                  id="constructionKgCo2eTotal"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="1"
                  formControlName="constructionKgCo2eTotal"
                />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="amortizationYears">
                  Amortissement (années)
                </label>
                <input
                  id="amortizationYears"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="1"
                  formControlName="amortizationYears"
                />
              </div>
            </div>
          </article>

          <article
            class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur"
            formGroupName="materials"
          >
            <header class="space-y-1">
              <h2 class="text-base font-semibold text-slate-900">Matériaux</h2>
              <p class="text-sm text-slate-600">Achats / remplacements sur la période.</p>
            </header>

            <div class="mt-4 grid grid-cols-1 gap-3">
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="materialsMassKg">
                  Masse (kg/an)
                </label>
                <input
                  id="materialsMassKg"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="1"
                  formControlName="massKg"
                />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="materialsFactor">
                  Facteur (kgCO₂e/kg)
                </label>
                <input
                  id="materialsFactor"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.01"
                  formControlName="factorKgCo2ePerKg"
                />
              </div>
            </div>
          </article>

          <article
            class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur"
            formGroupName="parking"
          >
            <header class="space-y-1">
              <h2 class="text-base font-semibold text-slate-900">Parking</h2>
              <p class="text-sm text-slate-600">Déplacements associés au site.</p>
            </header>

            <div class="mt-4 grid grid-cols-1 gap-3">
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="annualVehicleKm">
                  Distance (véhicule-km/an)
                </label>
                <input
                  id="annualVehicleKm"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="1"
                  formControlName="annualVehicleKm"
                />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="parkingFactor">
                  Facteur (kgCO₂e/km)
                </label>
                <input
                  id="parkingFactor"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.001"
                  formControlName="factorKgCo2ePerKm"
                />
              </div>
            </div>
          </article>

          <article
            class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur"
            formGroupName="energy"
          >
            <header class="space-y-1">
              <h2 class="text-base font-semibold text-slate-900">Consommation énergétique</h2>
              <p class="text-sm text-slate-600">Électricité + gaz sur la période.</p>
            </header>

            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="electricityKwh">
                  Électricité (kWh/an)
                </label>
                <input
                  id="electricityKwh"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="1"
                  formControlName="electricityKwh"
                />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="electricityFactor">
                  Facteur élec (kgCO₂e/kWh)
                </label>
                <input
                  id="electricityFactor"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.001"
                  formControlName="electricityFactorKgCo2ePerKwh"
                />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="gasKwh">Gaz (kWh/an)</label>
                <input
                  id="gasKwh"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="1"
                  formControlName="gasKwh"
                />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="gasFactor">
                  Facteur gaz (kgCO₂e/kWh)
                </label>
                <input
                  id="gasFactor"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.001"
                  formControlName="gasFactorKgCo2ePerKwh"
                />
              </div>
            </div>
          </article>

          <article
            class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur"
            formGroupName="operations"
          >
            <header class="space-y-1">
              <h2 class="text-base font-semibold text-slate-900">Exploitation</h2>
              <p class="text-sm text-slate-600">Déchets et eau (exemples).</p>
            </header>

            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="wasteKg">Déchets (kg/an)</label>
                <input
                  id="wasteKg"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="1"
                  formControlName="wasteKg"
                />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="wasteFactor">
                  Facteur déchets (kgCO₂e/kg)
                </label>
                <input
                  id="wasteFactor"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.01"
                  formControlName="wasteFactorKgCo2ePerKg"
                />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="waterM3">Eau (m³/an)</label>
                <input
                  id="waterM3"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="1"
                  formControlName="waterM3"
                />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-slate-900" for="waterFactor">
                  Facteur eau (kgCO₂e/m³)
                </label>
                <input
                  id="waterFactor"
                  class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.01"
                  formControlName="waterFactorKgCo2ePerM3"
                />
              </div>
            </div>
          </article>
        </section>
      </form>

      <section
        class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur"
        aria-label="Historique"
      >
        <header class="space-y-1">
          <h2 class="text-base font-semibold text-slate-900">Historique</h2>
          <p class="text-sm text-slate-600">Chaque relevé est sauvegardé localement (par utilisateur).</p>
        </header>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-160 text-left text-sm">
            <caption class="sr-only">Tableau des relevés enregistrés</caption>
            <thead class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" class="px-3 py-2">Date</th>
                <th scope="col" class="px-3 py-2">Site</th>
                <th scope="col" class="px-3 py-2">Total</th>
                <th scope="col" class="px-3 py-2">Intensité</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (historyDescending().length === 0) {
                <tr>
                  <td class="px-3 py-3 text-slate-600" colspan="4">Aucun relevé enregistré.</td>
                </tr>
              } @else {
                @for (snap of historyDescending(); track snap.id) {
                  <tr>
                    <th scope="row" class="px-3 py-2 font-medium text-slate-900">
                      {{ formatSnapshotDate(snap.createdAtIso) }}
                    </th>
                    <td class="px-3 py-2 text-slate-700">{{ snap.inputs.siteName }}</td>
                    <td class="px-3 py-2 tabular-nums text-slate-900">
                      {{ snap.result.totalTCo2e | number : '1.1-1' }} tCO₂e/an
                    </td>
                    <td class="px-3 py-2 tabular-nums text-slate-700">
                      @if (snap.result.intensityKgCo2ePerM2 !== null) {
                        {{ snap.result.intensityKgCo2ePerM2 | number : '1.0-0' }} kg/m²/an
                      } @else {
                        —
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `
})
export class DashboardComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly calculator = inject(CarbonCalculatorService);
  private readonly historyService = inject(CarbonHistoryService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusMessage = signal<string | null>(null);

  protected readonly form = this.fb.group({
    siteName: this.fb.control(DEFAULT_CARBON_INPUTS.siteName, {
      validators: [Validators.required]
    }),
    period: this.fb.control(DEFAULT_CARBON_INPUTS.period),
    surfaceAreaM2: this.fb.control(DEFAULT_CARBON_INPUTS.surfaceAreaM2, {
      validators: [Validators.min(0)]
    }),
    building: this.fb.group({
      constructionKgCo2eTotal: this.fb.control(DEFAULT_CARBON_INPUTS.building.constructionKgCo2eTotal, {
        validators: [Validators.min(0)]
      }),
      amortizationYears: this.fb.control(DEFAULT_CARBON_INPUTS.building.amortizationYears, {
        validators: [Validators.min(0)]
      })
    }),
    materials: this.fb.group({
      massKg: this.fb.control(DEFAULT_CARBON_INPUTS.materials.massKg, {
        validators: [Validators.min(0)]
      }),
      factorKgCo2ePerKg: this.fb.control(DEFAULT_CARBON_INPUTS.materials.factorKgCo2ePerKg, {
        validators: [Validators.min(0)]
      })
    }),
    parking: this.fb.group({
      annualVehicleKm: this.fb.control(DEFAULT_CARBON_INPUTS.parking.annualVehicleKm, {
        validators: [Validators.min(0)]
      }),
      factorKgCo2ePerKm: this.fb.control(DEFAULT_CARBON_INPUTS.parking.factorKgCo2ePerKm, {
        validators: [Validators.min(0)]
      })
    }),
    energy: this.fb.group({
      electricityKwh: this.fb.control(DEFAULT_CARBON_INPUTS.energy.electricityKwh, {
        validators: [Validators.min(0)]
      }),
      electricityFactorKgCo2ePerKwh: this.fb.control(
        DEFAULT_CARBON_INPUTS.energy.electricityFactorKgCo2ePerKwh,
        { validators: [Validators.min(0)] }
      ),
      gasKwh: this.fb.control(DEFAULT_CARBON_INPUTS.energy.gasKwh, {
        validators: [Validators.min(0)]
      }),
      gasFactorKgCo2ePerKwh: this.fb.control(DEFAULT_CARBON_INPUTS.energy.gasFactorKgCo2ePerKwh, {
        validators: [Validators.min(0)]
      })
    }),
    operations: this.fb.group({
      wasteKg: this.fb.control(DEFAULT_CARBON_INPUTS.operations.wasteKg, {
        validators: [Validators.min(0)]
      }),
      wasteFactorKgCo2ePerKg: this.fb.control(DEFAULT_CARBON_INPUTS.operations.wasteFactorKgCo2ePerKg, {
        validators: [Validators.min(0)]
      }),
      waterM3: this.fb.control(DEFAULT_CARBON_INPUTS.operations.waterM3, {
        validators: [Validators.min(0)]
      }),
      waterFactorKgCo2ePerM3: this.fb.control(DEFAULT_CARBON_INPUTS.operations.waterFactorKgCo2ePerM3, {
        validators: [Validators.min(0)]
      })
    })
  });

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  protected readonly inputs = computed<CarbonInputs>(() => this.formValue() as CarbonInputs);
  protected readonly result = computed(() => this.calculator.calculate(this.inputs()));

  protected readonly history = this.historyService.history;
  protected readonly historyDescending = computed(() => {
    const items = [...this.history()];
    items.reverse();
    return items;
  });

  private readonly latest = this.historyService.latest;

  protected readonly topCategoryLabel = computed(() => {
    const categories = this.result().categories;
    if (categories.length === 0) {
      return '—';
    }

    const top = [...categories].sort((a, b) => b.kgCo2e - a.kgCo2e)[0];
    return top?.label ?? '—';
  });

  protected readonly deltaVsLatestPercent = computed(() => {
    const latest = this.latest();
    if (!latest) {
      return null;
    }

    const prev = latest.result.totalKgCo2e;
    const curr = this.result().totalKgCo2e;
    if (prev <= 0) {
      return null;
    }

    return ((curr - prev) / prev) * 100;
  });

  private readonly historyCanvas = viewChild<ElementRef<HTMLCanvasElement>>('historyCanvas');
  private readonly breakdownCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('breakdownCanvas');

  private historyChart: Chart<'line'> | null = null;
  private breakdownChart: Chart<'doughnut'> | null = null;

  constructor() {
    afterNextRender(() => this.initCharts());

    this.destroyRef.onDestroy(() => {
      this.historyChart?.destroy();
      this.breakdownChart?.destroy();
      this.historyChart = null;
      this.breakdownChart = null;
    });

    effect(() => {
      const result = this.result();
      if (!this.breakdownChart) {
        return;
      }

      this.breakdownChart.data.labels = result.categories.map((c) => c.label);
      this.breakdownChart.data.datasets[0].data = result.categories.map((c) => c.tCo2e);
      this.breakdownChart.update();
    });

    effect(() => {
      const history = this.history();
      const canvasRef = this.historyCanvas();

      if (history.length === 0) {
        this.historyChart?.destroy();
        this.historyChart = null;
        return;
      }

      if (!canvasRef) {
        return;
      }

      if (!this.historyChart) {
        this.historyChart = this.createHistoryChart(canvasRef.nativeElement, history);
        return;
      }

      const labels = history.map((s) => this.formatSnapshotDate(s.createdAtIso, { short: true }));
      const series = history.map((s) => s.result.totalTCo2e);

      this.historyChart.data.labels = labels;
      this.historyChart.data.datasets[0].data = series;
      this.historyChart.update();
    });
  }

  protected saveSnapshot(): void {
    this.statusMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.historyService.addSnapshot(this.inputs());
    this.statusMessage.set('Relevé enregistré.');
  }

  protected resetToDefaults(): void {
    this.statusMessage.set(null);
    this.form.setValue(DEFAULT_CARBON_INPUTS);
    this.form.markAsPristine();
  }

  private initCharts(): void {
    const result = this.result();
    const breakdownConfig: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: result.categories.map((c) => c.label),
        datasets: [
          {
            label: 'tCO₂e/an',
            data: result.categories.map((c) => c.tCo2e)
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const raw = ctx.parsed;
                const value = typeof raw === 'number' ? raw : 0;
                const formatted = new Intl.NumberFormat('fr-FR', {
                  maximumFractionDigits: 1
                }).format(value);
                return `${ctx.label ?? 'Poste'}: ${formatted} tCO₂e/an`;
              }
            }
          }
        }
      }
    };

    this.breakdownChart = new Chart(this.breakdownCanvas().nativeElement, breakdownConfig);
  }

  private createHistoryChart(
    canvas: HTMLCanvasElement,
    history: readonly { createdAtIso: string; result: { totalTCo2e: number } }[]
  ): Chart<'line'> {
    const historyConfig: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: history.map((s) => this.formatSnapshotDate(s.createdAtIso, { short: true })),
        datasets: [
          {
            label: 'Total (tCO₂e/an)',
            data: history.map((s) => s.result.totalTCo2e),
            borderWidth: 2,
            borderColor: 'rgba(15, 23, 42, 1)',
            backgroundColor: 'rgba(15, 23, 42, 0.08)',
            tension: 0.35,
            fill: true,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const raw = ctx.parsed.y;
                const value = typeof raw === 'number' ? raw : 0;
                const formatted = new Intl.NumberFormat('fr-FR', {
                  maximumFractionDigits: 1
                }).format(value);
                return `${ctx.dataset.label ?? 'Valeur'}: ${formatted} tCO₂e/an`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => {
                const v = typeof value === 'number' ? value : Number(value);
                const formatted = new Intl.NumberFormat('fr-FR', {
                  maximumFractionDigits: 1
                }).format(Number.isFinite(v) ? v : 0);
                return `${formatted} t`;
              }
            }
          }
        }
      }
    };

    return new Chart(canvas, historyConfig);
  }

  protected formatSnapshotDate(iso: string, opts?: { short?: boolean }): string {
    const d = new Date(iso);
    if (opts?.short) {
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(d);
    }

    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d);
  }
}