import { Pokemon } from '../../pokedex/models/pokemon.model';
import { TYPE_MATCHUPS } from '../constants/type-matchups.constants';

export function typeCoverage(members: readonly Pokemon[]) {
  const types = Object.keys(TYPE_MATCHUPS);
  const known = members.filter((member) => member.types.every((type) => type in TYPE_MATCHUPS));
  const strengths = types
    .map((type) => ({
      type,
      count: known.filter((member) =>
        member.types.some((attack) => (TYPE_MATCHUPS[attack][type] ?? 1) > 1),
      ).length,
    }))
    .filter((entry) => entry.count > 0);
  const weaknesses = types
    .map((type) => ({
      type,
      count: known.filter(
        (member) =>
          member.types.reduce(
            (damage, defense) => damage * (TYPE_MATCHUPS[type][defense] ?? 1),
            1,
          ) > 1,
      ).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  return { strengths, weaknesses, unsupported: members.length - known.length };
}
