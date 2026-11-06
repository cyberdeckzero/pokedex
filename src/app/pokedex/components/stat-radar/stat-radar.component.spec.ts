import { TestBed } from '@angular/core/testing';
import type { ChartConfiguration } from 'chart.js';
import { StatRadarComponent } from './stat-radar.component';
import { Pokemon } from '../../models/pokemon.model';

const chart = vi.hoisted(() => ({ update: vi.fn(), destroy: vi.fn(), created: vi.fn() }));
vi.mock('chart.js', () => {
  return {
    RadarController: {},
    RadialLinearScale: {},
    LineElement: {},
    PointElement: {},
    Filler: {},
    Tooltip: {},
    Chart: class {
      static register = vi.fn();
      data;
      constructor(_canvas: HTMLCanvasElement, configuration: ChartConfiguration<'radar'>) {
        this.data = configuration.data;
        chart.created(configuration);
      }
      update = chart.update;
      destroy = chart.destroy;
    },
  };
});

const pokemon: Pokemon = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  sprite: '',
  types: ['electric'],
  total: 6,
  stats: { hp: 1, attack: 1, defense: 1, 'special-attack': 1, 'special-defense': 1, speed: 1 },
};

describe('radar chart lifecycle', () => {
  it('animates updates on the same chart instance and destroys it when the panel closes', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    TestBed.configureTestingModule({ imports: [StatRadarComponent] });
    const fixture = TestBed.createComponent(StatRadarComponent);
    fixture.componentRef.setInput('pokemon', pokemon);
    await fixture.whenStable();
    expect(chart.created).toHaveBeenCalledOnce();
    expect(chart.created.mock.calls[0][0].options.animation.duration).toBe(600);
    fixture.componentRef.setInput('pokemon', { ...pokemon, id: 6, name: 'charizard' });
    await fixture.whenStable();
    expect(chart.created).toHaveBeenCalledOnce();
    expect(chart.update).toHaveBeenCalledOnce();
    fixture.destroy();
    expect(chart.destroy).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
