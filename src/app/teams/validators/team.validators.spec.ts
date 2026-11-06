import { FormControl } from '@angular/forms';
import { firstValueFrom, isObservable, of } from 'rxjs';
import {
  teamNameValidator,
  uniqueTeamNameValidator,
  teamMembersValidator,
} from './team.validators';
import { TeamState } from '../models/team.model';

const ready: TeamState = {
  status: 'success',
  teams: [{ id: '1', trainerId: '1', name: 'Kanto Starters', pokemonIds: [25], createdAt: '' }],
  error: null,
  busy: false,
  mutationError: null,
  failedDeleteId: null,
};

describe('team validators', () => {
  afterEach(() => vi.useRealTimers());

  it('compares normalized names case-insensitively after a debounce and completes', async () => {
    vi.useFakeTimers();
    const validator = uniqueTeamNameValidator(of(ready));
    const result = validator(new FormControl('  kAnTo   starters  '));
    expect(isObservable(result)).toBe(true);
    if (!isObservable(result)) throw new Error('Expected observable validator');
    const completed = vi.fn();
    const values: unknown[] = [];
    result.subscribe({ next: (value) => values.push(value), complete: completed });
    await vi.advanceTimersByTimeAsync(299);
    expect(values).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(values).toEqual([{ nameTaken: true }]);
    expect(completed).toHaveBeenCalledOnce();
  });

  it('fails actionably when teams are unavailable and can validate again after recovery', async () => {
    vi.useFakeTimers();
    const invalidResult = uniqueTeamNameValidator(of({ ...ready, status: 'error' }))(
      new FormControl('Fresh team'),
    );
    if (!isObservable(invalidResult)) throw new Error('Expected observable validator');
    const invalid = firstValueFrom(invalidResult);
    await vi.advanceTimersByTimeAsync(300);
    expect(await invalid).toEqual({ teamsUnavailable: true });
    const validResult = uniqueTeamNameValidator(of(ready))(new FormControl('Fresh team'));
    if (!isObservable(validResult)) throw new Error('Expected observable validator');
    const valid = firstValueFrom(validResult);
    await vi.advanceTimersByTimeAsync(300);
    expect(await valid).toBeNull();
  });

  it('validates normalized name length and unique teams of one to six members', () => {
    expect(teamNameValidator(new FormControl('   '))).toEqual({ required: true });
    expect(teamNameValidator(new FormControl(' a '))).toEqual({ minlength: true });
    expect(teamNameValidator(new FormControl('a'.repeat(31)))).toEqual({ maxlength: true });
    expect(teamMembersValidator(new FormControl([]))).toEqual({ minMembers: true });
    expect(teamMembersValidator(new FormControl([1, 1]))).toEqual({ duplicateMembers: true });
    expect(teamMembersValidator(new FormControl([1, 2, 3, 4, 5, 6, 7]))).toEqual({
      maxMembers: true,
    });
    expect(teamMembersValidator(new FormControl([1, 2]))).toBeNull();
  });
});
