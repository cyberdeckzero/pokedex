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
  readonly showValues = input(false);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart<'radar'>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const pokemon = this.pokemon();
      if (!canvas) return;
      const values = STAT_KEYS.map((key) => pokemon.stats[key]);
      const labels = STAT_COLUMNS.slice(0, 6).map((stat, index) =>
        this.showValues() ? [stat.label, String(values[index])] : stat.label,
      );
      if (this.chart) {
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = values;
        this.chart.data.datasets[0].label = pokemon.name;
        this.chart.update();
        return;
      }
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const styles = getComputedStyle(canvas);
      const color = (name: string, fallback: string) =>
        styles.getPropertyValue(name).trim() || fallback;
      this.chart = new Chart(canvas, {
        type: 'radar',
        data: {
          labels,
          datasets: [
            {
              label: pokemon.name,
              data: values,
              borderColor: color('--chart-stroke', '#24573c'),
              backgroundColor: color('--chart-fill', '#24573c26'),
              pointBackgroundColor: color('--chart-stroke', '#24573c'),
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
              grid: { color: color('--chart-grid', '#9eb28e') },
              angleLines: { color: color('--chart-grid', '#9eb28e') },
              pointLabels: {
                color: color('--chart-label', '#3e5846'),
                font: { size: 14, family: 'IBM Plex Sans, sans-serif' },
              },
            },
          },
          plugins: { tooltip: { enabled: true, bodyFont: { size: 14 }, titleFont: { size: 14 } } },
        },
      });
    });
  }
}
