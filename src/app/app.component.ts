import { TeamDraftService } from './teams/services/team-draft.service';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PokemonTableComponent } from './pokedex/components/pokemon-table/pokemon-table.component';
import { PokemonDetailComponent } from './pokedex/components/pokemon-detail/pokemon-detail.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { PokedexHeaderComponent } from './pokedex/components/pokedex-header/pokedex-header.component';
import { PokemonStore } from './pokedex/state/pokemon.store';
import { PokemonScannerComponent } from './pokedex/components/pokemon-scanner/pokemon-scanner.component';
import { Pokemon } from './pokedex/models/pokemon.model';
import { TeamPanelComponent } from './teams/components/team-panel/team-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    PokemonTableComponent,
    PokemonDetailComponent,
    TeamPanelComponent,
    PokemonScannerComponent,
    PokedexHeaderComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  readonly draft = inject(TeamDraftService);
  readonly addLabel = computed(() => {
    const id = this.currentPokemon()?.id;
    if (id && this.draft.selectedIds().includes(id)) return 'Already in draft';
    if (this.draft.selectedIds().length >= 6) return 'Team draft is full';
    if (this.draft.isSubmitting() || this.draft.teamState().busy) return 'Team update pending';
    return 'Add to team draft';
  });
  readonly canAdd = computed(
    () => !!this.currentPokemon() && this.addLabel() === 'Add to team draft',
  );
  readonly catalogue = toSignal(inject(PokemonStore).catalogue$, { requireSync: true });
  readonly selectedPokemon = signal<Pokemon | null>(null);
  readonly draftMessage = computed(() => {
    const pokemon = this.currentPokemon();
    const ids = this.draft.selectedIds();
    if (!pokemon || !ids.includes(pokemon.id)) return '';
    const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1).replaceAll('-', ' ');
    return `${name} is in your team draft (${ids.length} / 6).`;
  });
  readonly panelOpen = signal(false);
  private detailOpener: HTMLElement | null = null;

  readonly currentPokemon = computed<Pokemon | null>(
    () => this.selectedPokemon() ?? this.catalogue().items[0] ?? null,
  );
  movePokemon(direction: -1 | 1): void {
    const catalogue = this.catalogue();
    if (catalogue.status !== 'success' || !catalogue.items.length) return;
    const index = Math.max(
      0,
      catalogue.items.findIndex((pokemon) => pokemon.id === this.currentPokemon()?.id),
    );
    this.selectedPokemon.set(
      catalogue.items[(index + direction + catalogue.items.length) % catalogue.items.length],
    );
  }
  focusSearch(): void {
    this.document.querySelector<HTMLInputElement>('#pokemon-search')?.focus();
  }
  addCurrentPokemon(): void {
    const pokemon = this.currentPokemon();
    if (!pokemon) return;
    this.draft.addPokemon(pokemon.id);
  }
  selectPokemon(pokemon: Pokemon): void {
    const active = this.document.activeElement;
    if (
      active instanceof HTMLElement &&
      active.matches('button, a, input, select, [tabindex]') &&
      !active.closest('app-pokemon-detail')
    )
      this.detailOpener = active;
    this.selectedPokemon.set(pokemon);
    this.panelOpen.set(true);
  }
  closeDetails(): void {
    const id = this.selectedPokemon()?.id;
    this.panelOpen.set(false);
    const row = id
      ? this.document.querySelector<HTMLButtonElement>(`[data-pokemon-id="${id}"]`)
      : null;
    const opener =
      this.detailOpener?.isConnected && this.detailOpener.getClientRects().length
        ? this.detailOpener
        : null;
    (opener ?? row ?? this.document.querySelector<HTMLInputElement>('#pokemon-search'))?.focus();
  }
}
