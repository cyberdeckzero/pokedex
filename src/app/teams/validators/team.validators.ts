import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, map, switchMap, take, timer } from 'rxjs';
import { TeamState } from '../models/team.model';

export function normalizeTeamName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export const teamNameValidator: ValidatorFn = (
  control: AbstractControl<string>,
): ValidationErrors | null => {
  const name = normalizeTeamName(control.value);
  if (!name) return { required: true };
  if (name.length < 3) return { minlength: true };
  if (name.length > 30) return { maxlength: true };
  return null;
};

export function uniqueTeamNameValidator(state$: Observable<TeamState>): AsyncValidatorFn {
  return (control: AbstractControl<string>) => {
    const name = normalizeTeamName(control.value).toLowerCase();
    return timer(300).pipe(
      switchMap(() => state$.pipe(take(1))),
      map((state) => {
        if (state.status !== 'success') return { teamsUnavailable: true };
        return state.teams.some((team) => normalizeTeamName(team.name).toLowerCase() === name)
          ? { nameTaken: true }
          : null;
      }),
    );
  };
}

export const teamMembersValidator: ValidatorFn = (
  control: AbstractControl<readonly number[]>,
): ValidationErrors | null => {
  const ids = control.value;
  if (!ids.length) return { minMembers: true };
  if (ids.length > 6) return { maxMembers: true };
  if (new Set(ids).size !== ids.length) return { duplicateMembers: true };
  return null;
};
