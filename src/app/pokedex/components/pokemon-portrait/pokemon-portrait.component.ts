import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { SPRITE_FALLBACK } from '../../constants/pokemon.constants';

@Component({
  selector: 'app-pokemon-portrait',
  standalone: true,
  templateUrl: './pokemon-portrait.component.html',
  styleUrl: './pokemon-portrait.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonPortraitComponent {
  readonly pokemon = input.required<Pokemon>();
  readonly tilt = signal({ x: 0, y: 0 });
  private readonly failedImages = signal(0);
  readonly pixels = Array.from({ length: 48 }, (_, index) => index);
  readonly imageUrl = computed(() => {
    if (this.failedImages() >= 2) return SPRITE_FALLBACK;
    if (this.failedImages() === 1) return this.pokemon().sprite || SPRITE_FALLBACK;
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${this.pokemon().id}.png`;
  });

  constructor() {
    effect(() => {
      this.pokemon().id;
      this.failedImages.set(0);
      this.resetTilt();
    });
  }
  onImageError(): void {
    this.failedImages.update((count) => Math.min(2, count + 1));
  }
  onPointerMove(event: PointerEvent): void {
    if (
      event.pointerType !== 'mouse' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const bounds = target.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const horizontal = Math.max(
      -1,
      Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
    );
    const vertical = Math.max(
      -1,
      Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1),
    );
    this.tilt.set({ x: vertical * -5, y: horizontal * 5 });
  }
  resetTilt(): void {
    this.tilt.set({ x: 0, y: 0 });
  }
}
