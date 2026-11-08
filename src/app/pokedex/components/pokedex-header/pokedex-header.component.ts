import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-pokedex-header',
  standalone: true,
  templateUrl: './pokedex-header.component.html',
  styleUrl: './pokedex-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokedexHeaderComponent {}
