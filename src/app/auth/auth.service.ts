import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

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

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}${this.apiPrefix}/auth/login`, payload)
      .pipe(map((response) => this.persistTokenIfPresent(response)));
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}${this.apiPrefix}/auth/register`, payload);
  }

  private persistTokenIfPresent(response: AuthResponse): AuthResponse {
    const tokenCandidate =
      typeof response.accessToken === 'string'
        ? response.accessToken
        : typeof response.token === 'string'
          ? response.token
          : null;

    if (tokenCandidate) {
      localStorage.setItem('auth_token', tokenCandidate);
    }

    return response;
  }
}
