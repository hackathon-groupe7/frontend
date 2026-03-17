import { DecimalPipe } from '@angular/common';
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
  imports: [DecimalPipe],
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

      @if (!snapshot().hasHistory) {
        <p class="rounded-md border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700" role="status">
          Aucun relevé carbone enregistré. Rendez-vous sur le dashboard pour enregistrer votre premier relevé.
        </p>
      }

      <section
        class="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur sm:grid-cols-3"
        aria-label="Synthèse"
      >
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Dernier relevé</p>
          <p class="text-2xl font-semibold text-slate-900">
            @if (snapshot().latest) {
              {{ snapshot().latest!.totalTco2e | number : '1.1-1' }} tCO₂e/an
            } @else {
              —
            }
          </p>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Intensité</p>
          <p class="text-2xl font-semibold text-slate-900">
            @if (snapshot().latest?.intensityKgCo2ePerM2 !== null && snapshot().latest) {
              {{ snapshot().latest!.intensityKgCo2ePerM2 | number : '1.0-0' }} kgCO₂e/m²/an
            } @else {
              —
            }
          </p>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Relevés enregistrés</p>
          <p class="text-2xl font-semibold text-slate-900">
            {{ snapshot().historyCount | number : '1.0-0' }}
          </p>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Graphiques">
        <article class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header class="space-y-1">
            <h2 class="text-base font-semibold text-slate-900">Évolution des émissions</h2>
            <p class="text-sm text-slate-600">Derniers relevés — total (tCO₂e/an).</p>
          </header>

          <div class="mt-4" aria-label="Graphique de tendance" role="img">
            <div class="relative h-64">
              <canvas #trendCanvas class="absolute inset-0 h-full w-full"></canvas>
            </div>
          </div>
        </article>

        <article class="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header class="space-y-1">
            <h2 class="text-base font-semibold text-slate-900">Répartition par poste</h2>
            <p class="text-sm text-slate-600">Détail du dernier relevé enregistré.</p>
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
          <h2 class="text-base font-semibold text-slate-900">Détails par poste</h2>
          <p class="text-sm text-slate-600">Synthèse du dernier relevé enregistré.</p>
        </header>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-160 text-left text-sm">
            <caption class="sr-only">Tableau des postes d'émissions</caption>
            <thead class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" class="px-3 py-2">Poste</th>
                <th scope="col" class="px-3 py-2">Émissions</th>
                <th scope="col" class="px-3 py-2">Part</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (!snapshot().latest) {
                <tr>
                  <td class="px-3 py-3 text-slate-600" colspan="3">Aucun relevé.</td>
                </tr>
              } @else {
                @for (category of snapshot().latest!.categories; track category.key) {
                  <tr>
                    <th scope="row" class="px-3 py-2 font-medium text-slate-900">{{ category.label }}</th>
                    <td class="px-3 py-2 tabular-nums text-slate-900">
                      {{ category.tCo2e | number : '1.1-1' }} tCO₂e/an
                    </td>
                    <td class="px-3 py-2 tabular-nums text-slate-700">
                      {{ category.sharePercent | number : '1.0-0' }}%
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

      this.trendChart.data.labels = [...snapshot.labels];
      this.trendChart.data.datasets[0].data = [...snapshot.totalSeriesTco2e];
      this.trendChart.update();

      this.shareChart.data.labels = snapshot.latest?.categories.map((c) => c.label) ?? [];
      this.shareChart.data.datasets[0].data = snapshot.latest?.categories.map((c) => c.tCo2e) ?? [];
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
        labels: [...snapshot.labels],
        datasets: [
          {
            label: 'Total (tCO₂e/an)',
            data: [...snapshot.totalSeriesTco2e],
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
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
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
                const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(
                  Number.isFinite(v) ? v : 0
                );
                return `${formatted} t`;
              }
            }
          }
        }
      }
    };

    const shareConfig: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: snapshot.latest?.categories.map((c) => c.label) ?? [],
        datasets: [
          {
            label: 'tCO₂e/an',
            data: snapshot.latest?.categories.map((c) => c.tCo2e) ?? []
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
                const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
                return `${ctx.label ?? 'Poste'}: ${formatted} tCO₂e/an`;
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
      doc.text("Rapport d'empreinte carbone", margin, margin);

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

      if (!snapshot.latest) {
        doc.text('Aucun relevé enregistré.', margin, y);
        y += 14;
      } else {
        const tFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
        doc.text(`Site: ${snapshot.latest.siteName}`, margin, y);
        y += 14;
        doc.text(`Total: ${tFormat.format(snapshot.latest.totalTco2e)} tCO₂e/an`, margin, y);
        y += 14;
        if (snapshot.latest.intensityKgCo2ePerM2 !== null) {
          doc.text(
            `Intensité: ${Math.round(snapshot.latest.intensityKgCo2ePerM2)} kgCO₂e/m²/an`,
            margin,
            y
          );
          y += 14;
        }
      }

      y += 24;
      doc.setFont('helvetica', 'bold');
      doc.text('Évolution des émissions', margin, y);
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
      doc.text('Répartition (dernier relevé)', margin, y);
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
      doc.text('Détails par poste', margin, y);
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      if (snapshot.latest) {
        const tFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
        for (const c of snapshot.latest.categories) {
          const line = `${c.label}: ${tFormat.format(c.tCo2e)} tCO₂e/an (${Math.round(c.sharePercent)}%)`;

          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }

          doc.text(line, margin, y);
          y += 12;
        }
      }

      const filenameDate = new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
        .format(new Date())
        .replaceAll('/', '-');

      doc.save(`rapport-empreinte-carbone-${filenameDate}.pdf`);
    } catch {
      this.exportError.set('Impossible de générer le PDF. Réessayez dans quelques instants.');
    } finally {
      this.exporting.set(false);
    }
  }
}
