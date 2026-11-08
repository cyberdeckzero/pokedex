import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { TypeCoverageComponent } from '../type-coverage/type-coverage.component';
import { signal, afterNextRender, Injector } from '@angular/core';
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
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    TypeCoverageComponent,
  ],
  templateUrl: './team-builder.component.html',
  styleUrl: './team-builder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamBuilderComponent {
  private readonly injector = inject(Injector);
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
  readonly interactionMessage = signal('');
  readonly coverageMembers = computed(() =>
    this.selectedPokemon().flatMap((member) => (member.pokemon ? [member.pokemon] : [])),
  );
  readonly canEnter = (drag: CdkDrag<number>) =>
    !this.isSubmitting() &&
    !this.teamState().busy &&
    (drag.dropContainer.id === 'team-draft-slots' ||
      (!this.selectedIds().includes(drag.data) && this.selectedIds().length < 6));
  drop(event: CdkDragDrop<readonly number[], unknown, number>): void {
    const id = event.item.data;
    if (event.previousContainer === event.container) this.draft.movePokemon(id, event.currentIndex);
    else this.draft.addPokemon(id, Math.min(event.currentIndex, this.selectedIds().length));
    this.interactionMessage.set('Team slots updated.');
  }
  moveMember(id: number, direction: -1 | 1, event: Event): void {
    event.preventDefault();
    const position = this.selectedIds().indexOf(id) + direction;
    if (position < 0 || position >= this.selectedIds().length) return;
    this.draft.movePokemon(id, position);
    this.interactionMessage.set(`Pokémon moved to slot ${position + 1}.`);
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      const chip = target.closest<HTMLElement>('[data-member-id]');
      afterNextRender(() => chip?.focus(), { injector: this.injector });
    }
  }
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
