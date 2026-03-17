import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable } from 'rxjs';

const TOKEN_STORAGE_KEY = 'auth_token';
const EMAIL_STORAGE_KEY = 'auth_email';

type LoginRequest = {
  email: string;
  password: string;
};

type RegisterRequest = {
  email: string;
  password: string;
};

type AuthResponse = {
  token?: string;
  accessToken?: string;
  message?: string;
} & Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = 'http://localhost:8080';
  private readonly apiPrefix = '/api';

  private readonly token = signal<string | null>(this.readStoredToken());

  readonly isAuthenticated = computed(() => {
    const t = this.token();
    return typeof t === 'string' && t.trim().length > 0;
  });

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}${this.apiPrefix}/auth/login`, payload)
      .pipe(map((response) => this.persistTokenIfPresent(response)));
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}${this.apiPrefix}/auth/register`, payload);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    this.token.set(null);
  }

  rememberEmail(email: string): void {
    const trimmed = email.trim();
    if (trimmed.length === 0) {
      localStorage.removeItem(EMAIL_STORAGE_KEY);
      return;
    }

    localStorage.setItem(EMAIL_STORAGE_KEY, trimmed);
  }

  getRememberedEmail(): string | null {
    const email = localStorage.getItem(EMAIL_STORAGE_KEY);
    return typeof email === 'string' && email.trim().length > 0 ? email : null;
  }

  private readStoredToken(): string | null {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    return typeof token === 'string' && token.trim().length > 0 ? token : null;
  }

  private persistTokenIfPresent(response: AuthResponse): AuthResponse {
    const tokenCandidate =
      typeof response.accessToken === 'string'
        ? response.accessToken
        : typeof response.token === 'string'
          ? response.token
          : null;

    if (tokenCandidate) {
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenCandidate);
      this.token.set(tokenCandidate);
    }

    return response;
  }
}
