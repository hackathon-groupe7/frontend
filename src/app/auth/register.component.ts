import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from './auth.service';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
      <header class="mb-6 space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Inscription</h1>
        <p class="text-sm text-slate-600">Créez un compte en quelques secondes.</p>
      </header>

      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()" aria-label="Formulaire d'inscription">
          <div class="space-y-1">
            <label class="text-sm font-medium text-slate-900" for="email">Email</label>
            <input
              id="email"
              class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              type="email"
              autocomplete="email"
              inputmode="email"
              formControlName="email"
              [attr.aria-invalid]="emailInvalid()"
            />
            @if (emailInvalid()) {
              <p class="text-sm text-rose-700" role="alert">Veuillez saisir un email valide.</p>
            }
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium text-slate-900" for="password">Mot de passe</label>
            <input
              id="password"
              class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              type="password"
              autocomplete="new-password"
              formControlName="password"
            />
          </div>

          @if (errorMessage()) {
            <p class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
              {{ errorMessage() }}
            </p>
          }

          @if (successMessage()) {
            <p
              class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              role="status"
            >
              {{ successMessage() }}
            </p>
          }

          <button
            type="submit"
            class="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="loading() || form.invalid"
          >
            @if (loading()) {<span>Création…</span>} @else {<span>Créer un compte</span>}
          </button>
        </form>
      </section>

      <p class="mt-4 text-center text-sm text-slate-600">
        Déjà inscrit ?
        <a class="font-medium text-slate-900 underline underline-offset-4" routerLink="/login">Se connecter</a>
      </p>
    </div>
  `
})
export class RegisterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: this.fb.control('', { validators: [Validators.required, Validators.email] }),
    password: this.fb.control('')
  });

  protected readonly emailInvalid = computed(() => {
    const control = this.form.controls.email;
    return control.touched && control.invalid;
  });

  submit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    const payload = {
      email: this.form.controls.email.value,
      password: this.form.controls.password.value
    };

    this.auth
      .register(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Compte créé. Vous pouvez maintenant vous connecter.');
          this.form.reset();
        },
        error: (err: unknown) => {
          const message = this.extractErrorMessage(err);
          this.errorMessage.set(message);
        }
      });
  }

  private extractErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const errorValue = (err as { error?: unknown }).error;
      if (errorValue && typeof errorValue === 'object' && 'message' in errorValue) {
        const m = (errorValue as { message?: unknown }).message;
        if (typeof m === 'string' && m.trim().length > 0) {
          return m;
        }
      }
    }

    return "Impossible de créer le compte. Vérifiez les champs et réessayez.";
  }
}
