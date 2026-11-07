import { DecimalPipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  DestroyRef,
  signal,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { LoadResult } from '../../../common/models/request-state.model';
import { STAT_COLUMNS } from '../../constants/pokemon.constants';
import { Pokemon, PokemonDetail } from '../../models/pokemon.model';
import { PokemonStore } from '../../state/pokemon.store';
import { PokemonPortraitComponent } from '../pokemon-portrait/pokemon-portrait.component';
import { TypeBadgesComponent } from '../type-badges/type-badges.component';
import { StatRadarComponent } from '../stat-radar/stat-radar.component';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [
    TitleCasePipe,
    DecimalPipe,
    PokemonPortraitComponent,
    TypeBadgesComponent,
    StatRadarComponent,
  ],
  templateUrl: './pokemon-detail.component.html',
  styleUrl: './pokemon-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape($event)' },
})
export class PokemonDetailComponent {
  readonly pokemon = input.required<Pokemon>();
  readonly close = output<void>();
  readonly modal = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private readonly panel = viewChild<ElementRef<HTMLDialogElement>>('panel');
  private readonly store = inject(PokemonStore);
  private readonly retryRequests = new Subject<void>();
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  readonly statColumns = STAT_COLUMNS;
  readonly detail = toSignal(
    toObservable(this.pokemon).pipe(
      map((pokemon) => pokemon.id),
      distinctUntilChanged(),
      switchMap((id) =>
        this.retryRequests.pipe(
          startWith(undefined),
          switchMap(() =>
            this.store.getDetail$(id).pipe(
              map((data): LoadResult<PokemonDetail | null> => ({ status: 'success', data })),
              startWith<LoadResult<PokemonDetail | null>>({ status: 'loading' }),
              catchError(() =>
                of<LoadResult<PokemonDetail | null>>({
                  status: 'error',
                  message: 'Details and abilities could not load. Check your connection and retry.',
                }),
              ),
            ),
          ),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } },
  );
  readonly displayed = computed(() => {
    const state = this.detail();
    return state.status === 'success' && state.data ? state.data.pokemon : this.pokemon();
  });

  constructor() {
    afterNextRender(() => {
      const panel = this.panel()?.nativeElement;
      if (!panel) return;
      const media = window.matchMedia?.('(max-width: 1199px)');
      const updateMode = () => {
        const focused = panel.contains(document.activeElement) ? document.activeElement : null;
        if (panel.open) panel.close();
        this.modal.set(media?.matches ?? false);
        // Native modality keeps background controls out of the narrow layout's tab order.
        if (this.modal()) panel.showModal();
        else if (panel.show) panel.show();
        else panel.setAttribute('open', '');
        if (focused instanceof HTMLElement) focused.focus();
        else this.closeButton()?.nativeElement.focus();
      };
      updateMode();
      media?.addEventListener('change', updateMode);
      this.destroyRef.onDestroy(() => media?.removeEventListener('change', updateMode));
    });
  }
  onEscape(event: Event): void {
    if (!this.modal() && !event.defaultPrevented) {
      event.preventDefault();
      this.requestClose();
    }
  }
  onCancel(event: Event): void {
    event.preventDefault();
    this.requestClose();
  }
  requestClose(): void {
    this.panel()?.nativeElement.close();
    this.close.emit();
  }
  retry(): void {
    this.retryRequests.next();
  }
}
