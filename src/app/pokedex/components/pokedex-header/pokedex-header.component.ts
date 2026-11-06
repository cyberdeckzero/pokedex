import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RequestStatus } from '../../../common/models/request-state.model';

@Component({
  selector: 'app-pokedex-header',
  standalone: true,
  templateUrl: './pokedex-header.component.html',
  styleUrl: './pokedex-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokedexHeaderComponent {
  readonly status = input.required<RequestStatus>();
  readonly label = computed(() => {
    switch (this.status()) {
      case 'success':
        return 'Database ready';
      case 'error':
        return 'Connection interrupted';
      case 'loading':
        return 'Synchronizing';
      default:
        return 'Standby';
    }
  });
}
