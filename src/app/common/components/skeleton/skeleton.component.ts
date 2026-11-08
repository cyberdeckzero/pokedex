import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SkeletonKind =
  'cards' | 'table' | 'profile' | 'abilities' | 'teams' | 'overview' | 'suggestions' | 'image';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class SkeletonComponent {
  readonly kind = input<SkeletonKind>('profile');
  readonly rows = [0, 1, 2];
  readonly tableRows = [0, 1, 2, 3, 4];
  readonly stats = [0, 1, 2, 3, 4, 5];
}
