import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { POKEMON_TYPES, STAT_COLUMNS } from '../../constants/pokemon.constants';
import { Pokemon, StatKey } from '../../models/pokemon.model';
import {
  createPokemonSelectors,
  INITIAL_TABLE_OPTIONS,
  TableOptions,
} from '../../state/pokemon.selectors';
import { PokemonStore } from '../../state/pokemon.store';
import { PokemonSpriteComponent } from '../pokemon-sprite/pokemon-sprite.component';
import { TypeBadgesComponent } from '../type-badges/type-badges.component';

@Component({
  selector: 'app-pokemon-table',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TitleCasePipe,
    PokemonSpriteComponent,
    TypeBadgesComponent,
    SkeletonComponent,
  ],
  templateUrl: './pokemon-table.component.html',
  styleUrl: './pokemon-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonTableComponent {
  readonly selectedId = input<number | null>(null);
  readonly detailOpen = input(false);
  readonly selected = output<Pokemon>();
  private readonly store = inject(PokemonStore);
  private readonly optionsSubject = new BehaviorSubject<TableOptions>(INITIAL_TABLE_OPTIONS);
  private readonly retryRequests = new Subject<void>();
  readonly search = new FormControl('', { nonNullable: true });
  readonly type = new FormControl('', { nonNullable: true });
  readonly types = POKEMON_TYPES;
  readonly statColumns = STAT_COLUMNS;
  readonly pageSizes = [10, 25, 50];
  readonly catalogue = toSignal(this.store.catalogue$, { requireSync: true });
  readonly options = toSignal(this.optionsSubject, { requireSync: true });
  private readonly search$ = this.search.valueChanges.pipe(
    startWith(''),
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((query) => {
      this.updateOptions({ page: 1 });
      return this.store.loadCatalogue$().pipe(
        map(() => query),
        startWith(query),
        catchError(() => of(query)),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  private readonly selectors = createPokemonSelectors(
    this.store.catalogue$,
    this.search$,
    this.optionsSubject,
  );
  readonly page = toSignal(this.selectors.page$, {
    initialValue: { items: [], total: 0, page: 1, pageCount: 1, pageSize: 10 },
  });
  private readonly retryAction = toSignal(
    this.retryRequests.pipe(
      exhaustMap(() =>
        this.store.loadCatalogue$().pipe(
          map(() => undefined),
          catchError(() => of(undefined)),
        ),
      ),
    ),
  );
  private readonly typeAction = toSignal(
    this.type.valueChanges.pipe(tap((type) => this.updateOptions({ type, page: 1 }))),
  );

  retry(): void {
    this.retryRequests.next();
  }
  clearFilters(): void {
    this.search.setValue('');
    this.type.setValue('');
    this.updateOptions({ page: 1 });
  }
  setPage(page: number): void {
    this.updateOptions({ page });
  }
  setPageSize(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement)
      this.updateOptions({ pageSize: Number(target.value), page: 1 });
  }
  sort(key: StatKey | 'total'): void {
    const current = this.options().sort;
    this.updateOptions({
      sort: {
        key,
        direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
      },
      page: 1,
    });
  }
  ariaSort(key: StatKey | 'total'): 'ascending' | 'descending' | 'none' {
    const sort = this.options().sort;
    return sort.key !== key ? 'none' : sort.direction === 'asc' ? 'ascending' : 'descending';
  }
  private updateOptions(options: Partial<TableOptions>): void {
    this.optionsSubject.next({ ...this.optionsSubject.value, ...options });
  }
}
