import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterRenderEffect,
  ElementRef,
  viewChild,
  viewChildren,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  Subject,
  fromEvent,
  merge,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { LoadResult } from '../../../common/models/request-state.model';
import { Pokemon } from '../../../pokedex/models/pokemon.model';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';
import { PokemonSpriteComponent } from '../../../pokedex/components/pokemon-sprite/pokemon-sprite.component';
import { TypeBadgesComponent } from '../../../pokedex/components/type-badges/type-badges.component';

@Component({
  selector: 'app-pokemon-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TitleCasePipe,
    PokemonSpriteComponent,
    TypeBadgesComponent,
    SkeletonComponent,
  ],
  templateUrl: './pokemon-picker.component.html',
  styleUrl: './pokemon-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonPickerComponent {
  readonly selectedIds = input.required<readonly number[]>();
  readonly disabled = input(false);
  readonly chosen = output<number>();
  readonly search = new FormControl('', { nonNullable: true });
  readonly open = signal(false);
  readonly activeIndex = signal(-1);
  private readonly dropdown = viewChild<ElementRef<HTMLDivElement>>('dropdown');
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly optionButtons = viewChildren<ElementRef<HTMLButtonElement>>('optionButton');
  private readonly store = inject(PokemonStore);
  private readonly retryRequests = new Subject<void>();
  readonly results = toSignal(
    this.search.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => {
        const term = query.trim().toLowerCase();
        if (!term) return of<LoadResult<readonly Pokemon[]>>({ status: 'success', data: [] });
        return this.retryRequests.pipe(
          startWith(undefined),
          switchMap(() =>
            this.store.loadCatalogue$().pipe(
              map((pokemon): LoadResult<readonly Pokemon[]> => ({
                status: 'success',
                data: pokemon.filter((item) => item.name.includes(term)),
              })),
              startWith<LoadResult<readonly Pokemon[]>>({ status: 'loading' }),
              catchError(() =>
                of<LoadResult<readonly Pokemon[]>>({
                  status: 'error',
                  message: 'Pokémon suggestions could not load. Check your connection and retry.',
                }),
              ),
            ),
          ),
        );
      }),
    ),
    { initialValue: { status: 'success', data: [] } },
  );
  readonly suggestions = computed(() => {
    const state = this.results();
    return state.status === 'success'
      ? state.data.filter((item) => !this.selectedIds().includes(item.id)).slice(0, 10)
      : [];
  });

  constructor() {
    afterRenderEffect(() => {
      this.results();
      this.suggestions();
      if (!this.open() || this.disabled()) return;
      const menu = this.dropdown()?.nativeElement;
      if (!menu) return;
      if (menu.showPopover && !menu.matches(':popover-open')) menu.showPopover();
      this.positionDropdown();
    });
    merge(fromEvent(window, 'resize'), fromEvent(document, 'scroll', { capture: true }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.open()) this.positionDropdown();
      });
    effect(() => {
      this.suggestions();
      this.activeIndex.set(-1);
    });
    effect(() => {
      if (this.disabled()) {
        this.search.disable({ emitEvent: false });
        this.open.set(false);
      } else this.search.enable({ emitEvent: false });
    });
  }
  private positionDropdown(): void {
    const menu = this.dropdown()?.nativeElement;
    const input = this.searchInput()?.nativeElement;
    if (!menu || !input) return;
    const bounds = input.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const below = Math.max(0, viewportHeight - bounds.bottom - 12);
    const above = Math.max(0, bounds.top - 12);
    const placeAbove = below < Math.min(menu.scrollHeight, 200) && above > below;
    menu.style.width = bounds.width + 'px';
    const height = Math.min(340, menu.scrollHeight, placeAbove ? above : below);
    menu.style.maxHeight = height + 'px';
    menu.style.left =
      Math.max(8, Math.min(bounds.left, window.innerWidth - bounds.width - 8)) + 'px';
    menu.style.top = (placeAbove ? Math.max(8, bounds.top - height - 6) : bounds.bottom + 6) + 'px';
  }
  retry(): void {
    this.searchInput()?.nativeElement.focus();
    this.open.set(true);
    this.retryRequests.next();
  }
  choose(pokemon: Pokemon): void {
    if (
      this.disabled() ||
      this.selectedIds().includes(pokemon.id) ||
      this.selectedIds().length >= 6
    )
      return;
    this.chosen.emit(pokemon.id);
    this.search.setValue('');
    this.open.set(false);
    this.activeIndex.set(-1);
  }
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open()) {
      event.stopPropagation();
      event.preventDefault();
      this.open.set(false);
      return;
    }
    if (event.key === 'Tab') {
      this.open.set(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.open.set(true);
      const count = this.suggestions().length;
      if (!count) return;
      const next =
        event.key === 'ArrowDown'
          ? this.activeIndex() + 1
          : this.activeIndex() <= 0
            ? count - 1
            : this.activeIndex() - 1;
      this.activeIndex.set(next % count);
      this.optionButtons()[next % count]?.nativeElement.scrollIntoView?.({
        block: 'nearest',
        inline: 'nearest',
      });
    }
    if (event.key === 'Enter' && this.open()) {
      event.preventDefault();
      const pokemon = this.suggestions()[this.activeIndex()];
      if (pokemon) this.choose(pokemon);
    }
  }
  dismiss(event: Event): void {
    if (!this.open()) return;
    event.stopPropagation();
    event.preventDefault();
    this.searchInput()?.nativeElement.focus();
    this.open.set(false);
  }
  onBlur(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof HTMLElement) || !event.relatedTarget.closest('.picker'))
      this.open.set(false);
  }
}
