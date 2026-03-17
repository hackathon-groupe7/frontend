import { CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import { Chart, type ChartConfiguration } from 'chart.js/auto';

import { AuthService } from '../auth/auth.service';
import { AccountStatsService } from './account-stats.service';

@Component({
  selector: 'app-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe],
  template: `
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-1">
          <h1 class="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">Mon compte</h1>
          <p class="text-sm text-slate-600">
            @if (snapshot().email) {
              Connecté en tant que <span class="font-medium text-slate-900">{{ snapshot().email }}</span>.
            } @else {
              Connecté.
            }
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="exporting()"
            (click)="generatePdf()"
          >
            @if (exporting()) {<span>Génération…</span>} @else {<span>Générer le rapport PDF</span>}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            (click)="logout()"
          >
            Déconnexion
          </button>
        </div>
      </header>

      @if (exportError()) {
        <p class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {{ exportError() }}
        </p>
      }

      <section
        class="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur sm:grid-cols-3"
        aria-label="Synthèse"
      >
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Coût estimé (mois)</p>
          <p class="text-2xl font-semibold text-slate-900">
            {{ snapshot().current.totalMonthlyCost | currency : 'EUR' : 'symbol' : '1.0-0' }}
          </p>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Objectif (mois)</p>
          <p class="text-2xl font-semibold text-slate-900">
            {{ snapshot().current.totalMonthlyTargetCost | currency : 'EUR' : 'symbol' : '1.0-0' }}
          </p>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Ressources au-dessus</p>
          <p class="text-2xl font-semibold text-slate-900">
            {{ snapshot().current.overTargetCount | number : '1.0-0' }}
          </p>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Graphiques">
        <article class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header class="space-y-1">
            <h2 class="text-base font-semibold text-slate-900">Évolution du coût total</h2>
            <p class="text-sm text-slate-600">6 derniers mois — coût estimé vs objectif.</p>
          </header>

          <div class="mt-4" aria-label="Graphique de tendance" role="img">
            <div class="relative h-64">
              <canvas #trendCanvas class="absolute inset-0 h-full w-full"></canvas>
            </div>
          </div>
        </article>

        <article class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header class="space-y-1">
            <h2 class="text-base font-semibold text-slate-900">Répartition du coût</h2>
            <p class="text-sm text-slate-600">Part de chaque ressource sur le mois courant.</p>
          </header>

          <div class="mt-4" aria-label="Graphique de répartition" role="img">
            <div class="relative h-64">
              <canvas #shareCanvas class="absolute inset-0 h-full w-full"></canvas>
            </div>
          </div>
        </article>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur" aria-label="Détails">
        <header class="space-y-1">
          <h2 class="text-base font-semibold text-slate-900">Détails par ressource</h2>
          <p class="text-sm text-slate-600">Synthèse à partir des valeurs par défaut du dashboard.</p>
        </header>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-160 text-left text-sm">
            <caption class="sr-only">Tableau des consommations et objectifs</caption>
            <thead class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" class="px-3 py-2">Ressource</th>
                <th scope="col" class="px-3 py-2">Conso</th>
                <th scope="col" class="px-3 py-2">Objectif</th>
                <th scope="col" class="px-3 py-2">Coût unitaire</th>
                <th scope="col" class="px-3 py-2">Coût estimé</th>
                <th scope="col" class="px-3 py-2">Statut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (resource of snapshot().current.perResource; track resource.key) {
                <tr>
                  <th scope="row" class="px-3 py-2 font-medium text-slate-900">{{ resource.label }}</th>
                  <td class="px-3 py-2 tabular-nums text-slate-700">
                    {{ resource.consumption | number : '1.0-0' }} {{ resource.unit }}
                  </td>
                  <td class="px-3 py-2 tabular-nums text-slate-700">
                    {{ resource.target | number : '1.0-0' }} {{ resource.unit }}
                  </td>
                  <td class="px-3 py-2 tabular-nums text-slate-700">
                    {{ resource.unitCost | currency : 'EUR' : 'symbol' : '1.2-2' }}
                  </td>
                  <td class="px-3 py-2 tabular-nums text-slate-900">
                    {{ resource.monthlyCost | currency : 'EUR' : 'symbol' : '1.0-0' }}
                  </td>
                  <td class="px-3 py-2">
                    @if (resource.isOverTarget) {
                      <span
                        class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900"
                      >
                        Au-dessus
                      </span>
                    } @else {
                      <span
                        class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900"
                      >
                        OK
                      </span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `
})
export class AccountComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly statsService = inject(AccountStatsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly snapshot = this.statsService.snapshot;

  protected readonly exporting = signal(false);
  protected readonly exportError = signal<string | null>(null);

  private readonly trendCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('trendCanvas');
  private readonly shareCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('shareCanvas');

  private trendChart: Chart<'line'> | null = null;
  private shareChart: Chart<'doughnut'> | null = null;

  constructor() {
    afterNextRender(() => this.initCharts());

    this.destroyRef.onDestroy(() => {
      this.trendChart?.destroy();
      this.shareChart?.destroy();
      this.trendChart = null;
      this.shareChart = null;
    });

    effect(() => {
      const snapshot = this.snapshot();
      if (!this.trendChart || !this.shareChart) {
        return;
      }

      this.trendChart.data.labels = [...snapshot.months];
      this.trendChart.data.datasets[0].data = [...snapshot.totalMonthlyCostSeries];
      this.trendChart.data.datasets[1].data = [...snapshot.totalMonthlyTargetCostSeries];
      this.trendChart.update();

      this.shareChart.data.labels = snapshot.resourceCostShare.map((r) => r.label);
      this.shareChart.data.datasets[0].data = snapshot.resourceCostShare.map((r) => r.monthlyCost);
      this.shareChart.update();
    });
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private initCharts(): void {
    const snapshot = this.snapshot();

    const trendConfig: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: [...snapshot.months],
        datasets: [
          {
            label: 'Coût estimé',
            data: [...snapshot.totalMonthlyCostSeries],
            borderWidth: 2,
            borderColor: 'rgba(15, 23, 42, 1)',
            backgroundColor: 'rgba(15, 23, 42, 0.08)',
            tension: 0.35,
            fill: true,
            pointRadius: 3
          },
          {
            label: 'Objectif',
            data: [...snapshot.totalMonthlyTargetCostSeries],
            borderWidth: 2,
            borderColor: 'rgba(5, 150, 105, 1)',
            backgroundColor: 'rgba(5, 150, 105, 0.06)',
            tension: 0.35,
            fill: false,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                const formatted = new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 0
                }).format(value);

                return `${ctx.dataset.label ?? 'Valeur'}: ${formatted}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => {
                const v = typeof value === 'number' ? value : Number(value);
                return new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 0
                }).format(Number.isFinite(v) ? v : 0);
              }
            }
          }
        }
      }
    };

    const shareConfig: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: snapshot.resourceCostShare.map((r) => r.label),
        datasets: [
          {
            label: 'Coût (mois)',
            data: snapshot.resourceCostShare.map((r) => r.monthlyCost)
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const raw = ctx.parsed;
                const value = typeof raw === 'number' ? raw : 0;
                const formatted = new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 0
                }).format(value);

                return `${ctx.label ?? 'Ressource'}: ${formatted}`;
              }
            }
          }
        }
      }
    };

    this.trendChart = new Chart(this.trendCanvas().nativeElement, trendConfig);
    this.shareChart = new Chart(this.shareCanvas().nativeElement, shareConfig);
  }

  protected async generatePdf(): Promise<void> {
    this.exportError.set(null);
    this.exporting.set(true);

    try {
      const snapshot = this.snapshot();

      const doc = new jsPDF({ format: 'a4', unit: 'pt' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;

      const generatedAt = new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'long',
        timeStyle: 'short'
      }).format(new Date());

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Rapport de consommation', margin, margin);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Généré le ${generatedAt}`, margin, margin + 18);
      if (snapshot.email) {
        doc.text(`Compte: ${snapshot.email}`, margin, margin + 34);
      }

      let y = margin + 64;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Synthèse', margin, y);

      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);

      const currency = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
      });

      doc.text(`Coût estimé (mois): ${currency.format(snapshot.current.totalMonthlyCost)}`, margin, y);
      y += 14;
      doc.text(
        `Objectif (mois): ${currency.format(snapshot.current.totalMonthlyTargetCost)}`,
        margin,
        y
      );
      y += 14;
      doc.text(`Ressources au-dessus: ${snapshot.current.overTargetCount}`, margin, y);

      y += 24;
      doc.setFont('helvetica', 'bold');
      doc.text('Évolution (6 derniers mois)', margin, y);
      y += 12;

      const trendImage = this.trendChart?.canvas?.toDataURL('image/png', 1.0) ?? null;
      if (trendImage) {
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = 220;
        if (y + imgHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        doc.addImage(trendImage, 'PNG', margin, y, imgWidth, imgHeight);
        y += imgHeight + 18;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('Répartition (mois courant)', margin, y);
      y += 12;

      const shareImage = this.shareChart?.canvas?.toDataURL('image/png', 1.0) ?? null;
      if (shareImage) {
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = 240;
        if (y + imgHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        doc.addImage(shareImage, 'PNG', margin, y, imgWidth, imgHeight);
        y += imgHeight + 18;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('Détails par ressource', margin, y);
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      for (const r of snapshot.current.perResource) {
        const line = `${r.label}: ${r.consumption} ${r.unit} / ${r.target} ${r.unit} — ${currency.format(
          r.monthlyCost
        )}`;

        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        doc.text(line, margin, y);
        y += 12;
      }

      const filenameDate = new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
        .format(new Date())
        .replaceAll('/', '-');

      doc.save(`rapport-consommation-${filenameDate}.pdf`);
    } catch {
      this.exportError.set('Impossible de générer le PDF. Réessayez dans quelques instants.');
    } finally {
      this.exporting.set(false);
    }
  }
}
