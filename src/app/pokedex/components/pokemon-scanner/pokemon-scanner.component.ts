import { StatRadarComponent } from '../stat-radar/stat-radar.component';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { CatalogueState } from '../../state/pokemon.store';
import { PokemonPortraitComponent } from '../pokemon-portrait/pokemon-portrait.component';
import { TypeBadgesComponent } from '../type-badges/type-badges.component';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';

@Component({
  selector: 'app-pokemon-scanner',
  standalone: true,
  imports: [
    DecimalPipe,
    TitleCasePipe,
    PokemonPortraitComponent,
    TypeBadgesComponent,
    SkeletonComponent,
    StatRadarComponent,
  ],
  templateUrl: './pokemon-scanner.component.html',
  styleUrl: './pokemon-scanner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonScannerComponent {
  readonly catalogue = input.required<CatalogueState>();
  readonly canAdd = input(true);
  readonly pokemon = input<Pokemon | null>(null);
  readonly inspect = output<Pokemon>();
  readonly step = output<-1 | 1>();
  readonly search = output<void>();
  readonly buildTeam = output<void>();

  reloadPage(): void {
    window.location.reload();
  }
}
