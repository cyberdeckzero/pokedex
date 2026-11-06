import { TestBed } from '@angular/core/testing';
import { PokemonPortraitComponent } from './pokemon-portrait.component';
import { Pokemon } from '../../models/pokemon.model';
import { SPRITE_FALLBACK } from '../../constants/pokemon.constants';

const bulbasaur: Pokemon = {
  id: 1,
  name: 'bulbasaur',
  height: 7,
  weight: 69,
  types: ['grass', 'poison'],
  sprite: 'https://example.com/bulbasaur.png',
  total: 318,
  stats: {
    hp: 45,
    attack: 49,
    defense: 49,
    'special-attack': 65,
    'special-defense': 65,
    speed: 45,
  },
};

describe('Pokédex portrait', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('falls back through artwork, the cached sprite, and the local image, then resets for a new entry', () => {
    const fixture = TestBed.createComponent(PokemonPortraitComponent);
    fixture.componentRef.setInput('pokemon', bulbasaur);
    fixture.detectChanges();
    const image: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(image.src).toContain('/other/official-artwork/1.png');
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(image.src).toBe(bulbasaur.sprite);
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(image.getAttribute('src')).toBe(SPRITE_FALLBACK);
    fixture.componentRef.setInput('pokemon', { ...bulbasaur, id: 25, name: 'pikachu' });
    fixture.detectChanges();
    expect(image.src).toContain('/other/official-artwork/25.png');
  });

  it('bounds pointer tilt, resets it on leaving, and respects reduced motion', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: false });
    vi.stubGlobal('matchMedia', matchMedia);
    const fixture = TestBed.createComponent(PokemonPortraitComponent);
    fixture.componentRef.setInput('pokemon', bulbasaur);
    fixture.detectChanges();
    const surface: HTMLElement = fixture.nativeElement.querySelector('.portrait');
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 200));
    surface.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 200, clientY: 0, pointerType: 'mouse' }),
    );
    expect(Math.abs(fixture.componentInstance.tilt().x)).toBeLessThanOrEqual(5);
    expect(Math.abs(fixture.componentInstance.tilt().y)).toBeLessThanOrEqual(5);
    expect(fixture.componentInstance.tilt().x).not.toBe(0);
    surface.dispatchEvent(new PointerEvent('pointerleave'));
    expect(fixture.componentInstance.tilt()).toEqual({ x: 0, y: 0 });
    matchMedia.mockReturnValue({ matches: true });
    surface.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 200, clientY: 0, pointerType: 'mouse' }),
    );
    expect(fixture.componentInstance.tilt()).toEqual({ x: 0, y: 0 });
  });
});
