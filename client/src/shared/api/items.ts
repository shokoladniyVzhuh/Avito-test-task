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

export async function getItems(query: ItemsListQuery = {}) {
  const response = await httpClient.get<ItemsListResponse>('/items', {
    params: {
      ...query,
      categories: query.categories?.join(','),
    },
  });

  return response.data;
}

export async function getItemById(id: number) {
  const response = await httpClient.get<Item>(`/items/${id}`);
  return response.data;
}

export async function updateItem(id: number, payload: UpdateItemPayload) {
  const response = await httpClient.put<{ success: boolean }>(
    `/items/${id}`,
    payload,
  );

  return response.data;
}
