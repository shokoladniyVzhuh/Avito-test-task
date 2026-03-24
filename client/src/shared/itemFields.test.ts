import { describe, expect, it } from 'vitest';
import { getItemMissingCharacteristicFields } from './itemFields.ts';
import type { Item } from './types/item.ts';

const baseItem = {
  id: 1,
  title: 'Test item',
  price: 100,
  createdAt: '2026-03-24T10:00:00.000Z',
  updatedAt: '2026-03-24T10:00:00.000Z',
} as const;

describe('getItemMissingCharacteristicFields', () => {
  it('returns labels for empty auto fields', () => {
    const item: Item = {
      ...baseItem,
      category: 'auto',
      params: {
        brand: '  ',
        model: 'Camry',
        yearOfManufacture: undefined,
        transmission: 'automatic',
        mileage: undefined,
        enginePower: 150,
      },
    };

    expect(getItemMissingCharacteristicFields(item)).toEqual([
      'Марка',
      'Год выпуска',
      'Пробег, км',
    ]);
  });

  it('does not mark filled electronics fields as missing', () => {
    const item: Item = {
      ...baseItem,
      category: 'electronics',
      params: {
        type: 'laptop',
        brand: 'Apple',
        model: 'MacBook Pro',
        condition: 'used',
        color: 'Space Gray',
      },
    };

    expect(getItemMissingCharacteristicFields(item)).toEqual([]);
  });
});
