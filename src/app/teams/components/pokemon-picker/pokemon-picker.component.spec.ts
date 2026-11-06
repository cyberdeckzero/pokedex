import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { PokemonPickerComponent } from './pokemon-picker.component';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';
import { Pokemon } from '../../../pokedex/models/pokemon.model';

const pokemon: Pokemon = {
  id: 25,
  name: 'pikachu',
  types: ['electric'],
  height: 4,
  weight: 60,
  sprite: '',
  total: 6,
  stats: { hp: 1, attack: 1, defense: 1, 'special-attack': 1, 'special-defense': 1, speed: 1 },
};

describe('Pokémon picker', () => {
  afterEach(() => vi.useRealTimers());
  it('recovers the same query after failure and supports keyboard selection without duplicates', async () => {
    vi.useFakeTimers();
    const loadCatalogue$ = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValue(of([pokemon]));
    TestBed.configureTestingModule({
      imports: [PokemonPickerComponent],
      providers: [{ provide: PokemonStore, useValue: { loadCatalogue$ } }],
    });
    const fixture = TestBed.createComponent(PokemonPickerComponent);
    fixture.componentRef.setInput('selectedIds', []);
    fixture.detectChanges();
    fixture.componentInstance.search.setValue('pika');
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    expect(fixture.componentInstance.results().status).toBe('error');
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.componentInstance.suggestions().map((item) => item.id)).toEqual([25]);
    const chosen = vi.fn();
    fixture.componentInstance.chosen.subscribe(chosen);
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.componentInstance.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(chosen).toHaveBeenCalledWith(25);
    fixture.componentRef.setInput('selectedIds', [25]);
    fixture.detectChanges();
    expect(fixture.componentInstance.suggestions()).toEqual([]);
  });

  it('ignores canceled search responses after a newer query', async () => {
    vi.useFakeTimers();
    const old = new Subject<readonly Pokemon[]>();
    const loadCatalogue$ = vi
      .fn()
      .mockReturnValueOnce(old)
      .mockReturnValueOnce(of([{ ...pokemon, id: 6, name: 'charizard' }]));
    TestBed.configureTestingModule({
      imports: [PokemonPickerComponent],
      providers: [{ provide: PokemonStore, useValue: { loadCatalogue$ } }],
    });
    const fixture = TestBed.createComponent(PokemonPickerComponent);
    fixture.componentRef.setInput('selectedIds', []);
    fixture.detectChanges();
    fixture.componentInstance.search.setValue('pika');
    await vi.advanceTimersByTimeAsync(300);
    fixture.componentInstance.search.setValue('char');
    await vi.advanceTimersByTimeAsync(300);
    old.next([pokemon]);
    fixture.detectChanges();
    expect(fixture.componentInstance.suggestions().map((item) => item.name)).toEqual(['charizard']);
  });
});
