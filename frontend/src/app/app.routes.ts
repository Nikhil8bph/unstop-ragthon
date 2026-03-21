import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'project/:projectId', component: DashboardComponent },
  { path: 'project/:projectId/folder/:folderId', component: DashboardComponent },
  { path: 'project/:projectId/folder/:folderId/file/:fileId', component: DashboardComponent },
  { path: '**', redirectTo: '' }
];
