import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PokemonTableComponent } from './pokedex/components/pokemon-table/pokemon-table.component';
import { PokemonDetailComponent } from './pokedex/components/pokemon-detail/pokemon-detail.component';
import { Pokemon } from './pokedex/models/pokemon.model';
import { TeamPanelComponent } from './teams/components/team-panel/team-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PokemonTableComponent, PokemonDetailComponent, TeamPanelComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  readonly selectedPokemon = signal<Pokemon | null>(null);
  readonly panelOpen = signal(false);

  selectPokemon(pokemon: Pokemon): void {
    this.selectedPokemon.set(pokemon);
    this.panelOpen.set(true);
  }
  closeDetails(): void {
    const id = this.selectedPokemon()?.id;
    this.panelOpen.set(false);
    this.selectedPokemon.set(null);
    const row = id
      ? this.document.querySelector<HTMLButtonElement>(`[data-pokemon-id="${id}"]`)
      : null;
    (row ?? this.document.querySelector<HTMLInputElement>('#pokemon-search'))?.focus();
  }
}
