import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'dashboard'
	},
	{
		path: 'dashboard',
		title: 'Dashboard – Consommation',
		loadComponent: () =>
			import('./dashboard/dashboard.component').then((m) => m.DashboardComponent)
	},
	{
		path: '**',
		redirectTo: 'dashboard'
	}
];
