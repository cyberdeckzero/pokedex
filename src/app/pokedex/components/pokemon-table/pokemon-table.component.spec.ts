import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { PokemonTableComponent } from './pokemon-table.component';
import { CatalogueState, PokemonStore } from '../../state/pokemon.store';

describe('Pokédex table request states', () => {
  afterEach(() => vi.useRealTimers());
  it('shows an error rather than no results, then retries the same search successfully', async () => {
    vi.useFakeTimers();
    const catalogue$ = new BehaviorSubject<CatalogueState>({
      status: 'idle',
      items: [],
      error: null,
      total: 0,
    });
    const loadCatalogue$ = vi
      .fn()
      .mockImplementationOnce(() => {
        catalogue$.next({ status: 'error', items: [], error: 'Connection unavailable', total: 0 });
        return throwError(() => new Error('offline'));
      })
      .mockImplementation(() => {
        catalogue$.next({ status: 'success', items: [], error: null, total: 0 });
        return of([]);
      });
    TestBed.configureTestingModule({
      imports: [PokemonTableComponent],
      providers: [{ provide: PokemonStore, useValue: { catalogue$, loadCatalogue$ } }],
    });
    const fixture = TestBed.createComponent(PokemonTableComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Connection unavailable');
    expect(element.textContent).not.toContain('No Pokémon match');
    expect(element.textContent).not.toContain('0 results');
    const retry = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Retry'),
    );
    retry?.click();
    fixture.detectChanges();
    expect(loadCatalogue$).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('No Pokémon are available');
  });
});
