export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export type LoadResult<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'success'; readonly data: T };

export interface GraphqlResponse<T> {
  readonly data?: T | null;
  readonly errors?: readonly { readonly message: string }[];
}
