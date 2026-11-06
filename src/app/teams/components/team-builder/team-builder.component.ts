import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Subject, exhaustMap, finalize, startWith, tap } from 'rxjs';
import { PokemonSpriteComponent } from '../../../pokedex/components/pokemon-sprite/pokemon-sprite.component';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';
import { TeamStore } from '../../state/team.store';
import {
  normalizeTeamName,
  teamMembersValidator,
  teamNameValidator,
  uniqueTeamNameValidator,
} from '../../validators/team.validators';
import { PokemonPickerComponent } from '../pokemon-picker/pokemon-picker.component';

@Component({
  selector: 'app-team-builder',
  standalone: true,
  imports: [ReactiveFormsModule, TitleCasePipe, PokemonPickerComponent, PokemonSpriteComponent],
  templateUrl: './team-builder.component.html',
  styleUrl: './team-builder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamBuilderComponent {
  readonly created = output<string>();
  readonly reloadTeams = output<void>();
  private readonly teamStore = inject(TeamStore);
  private readonly pokemonStore = inject(PokemonStore);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly submitRequests = new Subject<void>();
  readonly isSubmitting = signal(false);
  readonly savedMessage = signal('');
  readonly teamState = toSignal(this.teamStore.state$, { requireSync: true });
  readonly form = this.fb.group({
    name: this.fb.control('', {
      validators: teamNameValidator,
      asyncValidators: uniqueTeamNameValidator(this.teamStore.state$),
    }),
    pokemonIds: this.fb.control<number[]>([], { validators: teamMembersValidator }),
  });
  readonly formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly selectedIds = toSignal(
    this.form.controls.pokemonIds.valueChanges.pipe(startWith(this.form.controls.pokemonIds.value)),
    { requireSync: true },
  );
  private readonly pokemon = toSignal(this.pokemonStore.pokemon$, { initialValue: [] });
  readonly selectedPokemon = computed(() =>
    this.selectedIds().flatMap((id) => {
      const pokemon = this.pokemon().find((item) => item.id === id);
      return pokemon ? [pokemon] : [];
    }),
  );
  readonly canSubmit = computed(
    () =>
      this.formStatus() === 'VALID' &&
      this.teamState().status === 'success' &&
      !this.teamState().busy &&
      !this.isSubmitting(),
  );
  private readonly validationKey = computed(
    () =>
      this.teamState().status +
      ':' +
      this.teamState()
        .teams.map((team) => team.name)
        .join('|'),
  );
  private readonly submitAction = toSignal(
    this.submitRequests.pipe(
      exhaustMap(() => {
        this.isSubmitting.set(true);
        this.savedMessage.set('');
        const draft = this.form.getRawValue();
        return this.teamStore
          .create$({ name: normalizeTeamName(draft.name), pokemonIds: draft.pokemonIds })
          .pipe(
            tap((team) => {
              if (!team) return;
              this.form.reset({ name: '', pokemonIds: [] });
              this.savedMessage.set(`“${team.name}” saved.`);
              this.created.emit(team.id);
            }),
            finalize(() => this.isSubmitting.set(false)),
          );
      }),
    ),
  );

  constructor() {
    effect(() => {
      this.validationKey();
      // Revalidate after teams recover or change, including a name entered while offline.
      untracked(() => this.form.controls.name.updateValueAndValidity());
    });
  }
  normalizeName(): void {
    const name = this.form.controls.name;
    const normalized = normalizeTeamName(name.value);
    if (normalized !== name.value) name.setValue(normalized);
  }
  addPokemon(id: number): void {
    const control = this.form.controls.pokemonIds;
    if (
      this.isSubmitting() ||
      this.teamState().busy ||
      control.value.includes(id) ||
      control.value.length >= 6
    )
      return;
    control.setValue([...control.value, id]);
    control.markAsDirty();
    control.markAsTouched();
  }
  removePokemon(id: number): void {
    if (this.isSubmitting() || this.teamState().busy) return;
    const control = this.form.controls.pokemonIds;
    control.setValue(control.value.filter((item) => item !== id));
    control.markAsDirty();
    control.markAsTouched();
  }
  submit(): void {
    this.form.markAllAsTouched();
    if (!this.form.valid || !this.canSubmit()) return;
    this.submitRequests.next();
  }
}
