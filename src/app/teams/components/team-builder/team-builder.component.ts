import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { PokemonSpriteComponent } from '../../../pokedex/components/pokemon-sprite/pokemon-sprite.component';
import { TeamDraftService } from '../../services/team-draft.service';
import { PokemonPickerComponent } from '../pokemon-picker/pokemon-picker.component';

@Component({
  selector: 'app-team-builder',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TitleCasePipe,
    PokemonPickerComponent,
    PokemonSpriteComponent,
    SkeletonComponent,
  ],
  templateUrl: './team-builder.component.html',
  styleUrl: './team-builder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamBuilderComponent {
  readonly created = output<string>();
  readonly reloadTeams = output<void>();
  readonly draft = inject(TeamDraftService);
  readonly form = this.draft.form;
  readonly teamState = this.draft.teamState;
  readonly selectedIds = this.draft.selectedIds;
  readonly selectedPokemon = this.draft.selectedPokemon;
  readonly isSubmitting = this.draft.isSubmitting;
  readonly savedMessage = this.draft.savedMessage;
  readonly canSubmit = this.draft.canSubmit;
  readonly emptySlots = computed(() =>
    Array.from(
      { length: Math.max(0, 6 - this.selectedIds().length) },
      (_, index) => this.selectedIds().length + index + 1,
    ),
  );

  constructor() {
    this.draft.created$.pipe(takeUntilDestroyed()).subscribe((id) => this.created.emit(id));
  }
  normalizeName(): void {
    this.draft.normalizeName();
  }
  addPokemon(id: number): void {
    this.draft.addPokemon(id);
  }
  removePokemon(id: number): void {
    this.draft.removePokemon(id);
  }
  submit(): void {
    this.draft.submit();
  }
}
