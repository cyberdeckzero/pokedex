import { RequestStatus } from '../../common/models/request-state.model';

export interface Team {
  readonly id: string;
  readonly trainerId: string;
  readonly name: string;
  readonly pokemonIds: readonly number[];
  readonly createdAt: string;
  readonly pending?: boolean;
}

export interface NewTeam {
  readonly name: string;
  readonly pokemonIds: readonly number[];
}

export interface TeamState {
  readonly teams: readonly Team[];
  readonly status: RequestStatus;
  readonly error: string | null;
  readonly busy: boolean;
  readonly mutationError: string | null;
  readonly failedDeleteId: string | null;
}
