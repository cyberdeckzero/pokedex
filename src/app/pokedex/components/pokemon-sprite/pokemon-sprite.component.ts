import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { SPRITE_FALLBACK } from '../../constants/pokemon.constants';

@Component({
  selector: 'app-pokemon-sprite',
  standalone: true,
  templateUrl: './pokemon-sprite.component.html',
  styleUrl: './pokemon-sprite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonSpriteComponent {
  readonly url = input.required<string>();
  readonly size = input(48);
  readonly failed = signal(false);
  readonly fallback = SPRITE_FALLBACK;
  constructor() {
    effect(() => {
      this.url();
      this.failed.set(false);
    });
  }
}
