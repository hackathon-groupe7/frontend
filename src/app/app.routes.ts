import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'dashboard'
	},
	{
		path: 'login',
		title: 'Connexion',
		loadComponent: () =>
			import('./auth/login.component').then((m) => m.LoginComponent)
	},
	{
		path: 'register',
		title: 'Inscription',
		loadComponent: () =>
			import('./auth/register.component').then((m) => m.RegisterComponent)
	},
	{
		path: 'dashboard',
		title: 'Dashboard – Consommation',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./dashboard/dashboard.component').then((m) => m.DashboardComponent)
	},
	{
		path: '**',
		redirectTo: 'dashboard'
	}
];
