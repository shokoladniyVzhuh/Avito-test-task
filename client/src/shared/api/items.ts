import { httpClient } from './http.ts';
import type {
  Item,
  ItemsListQuery,
  ItemsListResponse,
  UpdateItemPayload,
} from '../types/item.ts';

export const itemQueryKeys = {
  all: ['items'] as const,
  list: (query: ItemsListQuery) => ['items', 'list', query] as const,
  detail: (id: number) => ['items', 'detail', id] as const,
};

export async function getItems(query: ItemsListQuery = {}, signal?: AbortSignal) {
  const response = await httpClient.get<ItemsListResponse>('/items', {
    params: {
      ...query,
      categories: query.categories?.join(','),
    },
    signal,
  });

  return response.data;
}

export async function getItemById(id: number, signal?: AbortSignal) {
  const response = await httpClient.get<Item>(`/items/${id}`, { signal });
  return response.data;
}

export async function updateItem(
  id: number,
  payload: UpdateItemPayload,
  signal?: AbortSignal,
) {
  const response = await httpClient.put<{ success: boolean }>(
    `/items/${id}`,
    payload,
    { signal },
  );

  return response.data;
}
