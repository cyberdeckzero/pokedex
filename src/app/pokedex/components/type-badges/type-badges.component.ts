import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-type-badges',
  standalone: true,
  templateUrl: './type-badges.component.html',
  styleUrl: './type-badges.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeBadgesComponent {
  readonly types = input.required<readonly string[]>();
}
