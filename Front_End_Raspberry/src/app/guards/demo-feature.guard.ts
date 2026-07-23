import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { environment } from '../../environments/environment';

/**
 * Chặn các route không thuộc phạm vi bản demo (visitor log, jobs, zalo, semester management) -
 * xem document/plans/clever-scribbling-coral.md §Scope. No-op trên build thật (environment.demoMode
 * = false), vì cùng một Angular source phục vụ cả hai bản build.
 */
@Injectable({
  providedIn: 'root'
})
export class DemoFeatureGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    if (environment.demoMode) {
      this.router.navigate(['/settings']);
      return false;
    }
    return true;
  }
}
