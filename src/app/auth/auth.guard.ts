import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const TOKEN_STORAGE_KEY = 'auth_token';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (token && token.trim().length > 0) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};