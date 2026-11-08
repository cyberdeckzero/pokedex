import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Pokemon } from '../../../pokedex/models/pokemon.model';
import { typeCoverage } from '../../utils/type-coverage.util';

@Component({
  selector: 'app-type-coverage',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './type-coverage.component.html',
  styleUrl: './type-coverage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeCoverageComponent {
  readonly members = input.required<readonly Pokemon[]>();
  readonly coverage = computed(() => typeCoverage(this.members()));
}
