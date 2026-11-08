import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Pokemon } from '../../models/pokemon.model';
import { STAT_COLUMNS } from '../../constants/pokemon.constants';
import { PokemonSpriteComponent } from '../pokemon-sprite/pokemon-sprite.component';
import { TypeBadgesComponent } from '../type-badges/type-badges.component';
@Component({
  selector: 'app-pokemon-card',
  standalone: true,
  imports: [TitleCasePipe, PokemonSpriteComponent, TypeBadgesComponent],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonCardComponent {
  readonly pokemon = input.required<Pokemon>();
  readonly active = input(false);
  readonly addDisabled = input(false);
  readonly selected = output<Pokemon>();
  readonly inspected = output<Pokemon>();
  readonly added = output<number>();
  readonly statColumns = STAT_COLUMNS;
}
