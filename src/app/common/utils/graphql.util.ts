import { GraphqlResponse } from '../models/request-state.model';

export function requireGraphqlData<T>(response: GraphqlResponse<T>): T {
  if (response.errors?.length) throw new Error('The server could not complete the request.');
  if (response.data == null) throw new Error('The server returned an incomplete response.');
  return response.data;
}
