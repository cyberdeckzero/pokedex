import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { PokemonDetailComponent } from './pokemon-detail.component';
import { PokemonStore } from '../../state/pokemon.store';
import { Pokemon, PokemonDetail } from '../../models/pokemon.model';
import { StatRadarComponent } from '../stat-radar/stat-radar.component';

const first: Pokemon = {
  id: 25,
  name: 'pikachu',
  types: ['electric'],
  sprite: '',
  height: 4,
  weight: 60,
  total: 6,
  stats: { hp: 1, attack: 1, defense: 1, 'special-attack': 1, 'special-defense': 1, speed: 1 },
};

describe('Pokémon detail recovery', () => {
  it('keeps the latest selection when old responses arrive and retries abilities without reselection', async () => {
    const older = new Subject<PokemonDetail>();
    const newer = new Subject<PokemonDetail>();
    const getDetail$ = vi
      .fn()
      .mockReturnValueOnce(older)
      .mockReturnValueOnce(newer)
      .mockReturnValueOnce(
        of({
          pokemon: { ...first, id: 6, name: 'charizard' },
          abilities: [{ name: 'blaze', effect: 'Powers up fire moves.', hidden: false }],
        }),
      );
    TestBed.configureTestingModule({
      imports: [PokemonDetailComponent],
      providers: [{ provide: PokemonStore, useValue: { getDetail$ } }],
    });
    // The chart has its own lifecycle; this test exercises HTTP state and cancellation.
    TestBed.overrideTemplate(StatRadarComponent, '');
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(PokemonDetailComponent);
    fixture.componentRef.setInput('pokemon', first);
    await fixture.whenStable();
    expect(fixture.componentInstance.detail().status).toBe('loading');
    fixture.componentRef.setInput('pokemon', { ...first, id: 6, name: 'charizard' });
    await fixture.whenStable();
    older.next({ pokemon: first, abilities: [{ name: 'old ability', effect: '', hidden: false }] });
    newer.error(new Error('offline'));
    await fixture.whenStable();
    expect(fixture.componentInstance.detail().status).toBe('error');
    fixture.componentInstance.retry();
    await fixture.whenStable();
    const detail = fixture.componentInstance.detail();
    expect(detail.status).toBe('success');
    if (detail.status === 'success') expect(detail.data?.abilities[0].name).toBe('blaze');
    expect(getDetail$.mock.calls.map((call) => call[0])).toEqual([25, 6, 6]);
  });
});
