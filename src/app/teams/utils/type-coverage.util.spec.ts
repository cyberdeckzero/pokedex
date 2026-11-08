import { Pokemon } from '../../pokedex/models/pokemon.model';
import { typeCoverage } from './type-coverage.util';
const member = (types: string[]): Pokemon => ({
  id: 6,
  name: 'test',
  types,
  height: 1,
  weight: 1,
  sprite: '',
  total: 6,
  stats: { hp: 1, attack: 1, defense: 1, 'special-attack': 1, 'special-defense': 1, speed: 1 },
});
describe('standard type coverage', () => {
  it('combines dual typing and immunities rather than adding weaknesses', () => {
    const result = typeCoverage([member(['fire', 'flying']), member(['ground', 'flying'])]);
    expect(result.weaknesses.find((entry) => entry.type === 'electric')?.count).toBe(1);
    expect(result.weaknesses.find((entry) => entry.type === 'rock')?.count).toBe(1);
    expect(result.strengths.find((entry) => entry.type === 'grass')?.count).toBe(2);
  });
  it('handles no members and explicitly excludes unsupported special types', () => {
    expect(typeCoverage([]).weaknesses).toEqual([]);
    expect(typeCoverage([member(['stellar'])]).unsupported).toBe(1);
  });
});
