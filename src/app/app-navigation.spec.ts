import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AppComponent } from './app.component';
import { PokemonStore } from './pokedex/state/pokemon.store';
import { Pokemon } from './pokedex/models/pokemon.model';

const first: Pokemon = {
  id: 1,
  name: 'bulbasaur',
  types: ['grass'],
  sprite: '',
  height: 7,
  weight: 69,
  total: 6,
  stats: { hp: 1, attack: 1, defense: 1, 'special-attack': 1, 'special-defense': 1, speed: 1 },
};
const last: Pokemon = { ...first, id: 25, name: 'pikachu', types: ['electric'] };

describe('Pokédex device navigation', () => {
  it('wraps through cached entries and retains the displayed record when the drawer closes', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PokemonStore,
          useValue: {
            catalogue$: new BehaviorSubject({
              status: 'success',
              items: [first, last],
              total: 2,
              error: null,
            }),
          },
        },
      ],
    });
    TestBed.overrideTemplate(AppComponent, '');
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.currentPokemon()?.id).toBe(1);
    app.movePokemon(-1);
    expect(app.currentPokemon()?.id).toBe(25);
    app.movePokemon(1);
    expect(app.currentPokemon()?.id).toBe(1);
    app.selectPokemon(last);
    app.closeDetails();
    expect(app.panelOpen()).toBe(false);
    expect(app.currentPokemon()?.id).toBe(25);
  });
});
