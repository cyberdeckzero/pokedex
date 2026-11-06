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
  readonly catalogue = toSignal(inject(PokemonStore).catalogue$, { requireSync: true });
  readonly selectedPokemon = signal<Pokemon | null>(null);
  readonly panelOpen = signal(false);

  readonly currentPokemon = computed(
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
  focusTeamBuilder(): void {
    this.document.querySelector<HTMLInputElement>('#team-name')?.focus();
  }
  selectPokemon(pokemon: Pokemon): void {
    this.selectedPokemon.set(pokemon);
    this.panelOpen.set(true);
  }
  closeDetails(): void {
    const id = this.selectedPokemon()?.id;
    this.panelOpen.set(false);
    const row = id
      ? this.document.querySelector<HTMLButtonElement>(`[data-pokemon-id="${id}"]`)
      : null;
    (row ?? this.document.querySelector<HTMLInputElement>('#pokemon-search'))?.focus();
  }
}
