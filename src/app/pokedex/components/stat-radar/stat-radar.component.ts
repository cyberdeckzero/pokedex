import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  Chart,
  Filler,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Pokemon, STAT_KEYS } from '../../models/pokemon.model';
import { STAT_COLUMNS } from '../../constants/pokemon.constants';

Chart.register(RadarController, RadialLinearScale, LineElement, PointElement, Filler, Tooltip);

@Component({
  selector: 'app-stat-radar',
  standalone: true,
  templateUrl: './stat-radar.component.html',
  styleUrl: './stat-radar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatRadarComponent {
  readonly pokemon = input.required<Pokemon>();
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart<'radar'>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const pokemon = this.pokemon();
      if (!canvas) return;
      const values = STAT_KEYS.map((key) => pokemon.stats[key]);
      if (this.chart) {
        this.chart.data.datasets[0].data = values;
        this.chart.data.datasets[0].label = pokemon.name;
        this.chart.update();
        return;
      }
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.chart = new Chart(canvas, {
        type: 'radar',
        data: {
          labels: STAT_COLUMNS.slice(0, 6).map((stat) => stat.label),
          datasets: [
            {
              label: pokemon.name,
              data: values,
              borderColor: '#2257c9',
              backgroundColor: 'rgba(34,87,201,.14)',
              pointBackgroundColor: '#2257c9',
              pointRadius: 3,
              borderWidth: 2,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: reducedMotion ? false : { duration: 600, easing: 'easeOutQuart' },
          scales: {
            r: {
              min: 0,
              max: 255,
              ticks: { display: false, stepSize: 51 },
              grid: { color: '#dce3ed' },
              angleLines: { color: '#dce3ed' },
              pointLabels: { color: '#57667c', font: { size: 11 } },
            },
          },
          plugins: { tooltip: { enabled: true } },
        },
      });
    });
  }
}
