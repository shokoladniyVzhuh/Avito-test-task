import type { Item, ItemCategory } from './types/item.ts';

export type FieldConfig = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder: string;
  min?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
};

export const fieldConfigsByCategory: Record<ItemCategory, FieldConfig[]> = {
  auto: [
    {
      name: 'brand',
      label: 'Марка',
      type: 'text',
      placeholder: 'Например, Toyota',
    },
    {
      name: 'model',
      label: 'Модель',
      type: 'text',
      placeholder: 'Например, Camry',
    },
    {
      name: 'yearOfManufacture',
      label: 'Год выпуска',
      type: 'number',
      placeholder: 'Например, 2020',
      min: 1,
      step: 1,
    },
    {
      name: 'transmission',
      label: 'Коробка передач',
      type: 'select',
      placeholder: 'Выберите коробку передач',
      options: [
        { value: 'automatic', label: 'Автоматическая' },
        { value: 'manual', label: 'Механическая' },
      ],
    },
    {
      name: 'mileage',
      label: 'Пробег, км',
      type: 'number',
      placeholder: 'Например, 120000',
      min: 1,
      step: 1,
    },
    {
      name: 'enginePower',
      label: 'Мощность двигателя, л.с.',
      type: 'number',
      placeholder: 'Например, 150',
      min: 1,
      step: 1,
    },
  ],
  real_estate: [
    {
      name: 'type',
      label: 'Тип недвижимости',
      type: 'select',
      placeholder: 'Выберите тип недвижимости',
      options: [
        { value: 'flat', label: 'Квартира' },
        { value: 'house', label: 'Дом' },
        { value: 'room', label: 'Комната' },
      ],
    },
    {
      name: 'address',
      label: 'Адрес',
      type: 'text',
      placeholder: 'Например, г. Москва, ул. Тверская, 1',
    },
    {
      name: 'area',
      label: 'Площадь, м²',
      type: 'number',
      placeholder: 'Например, 45.2',
      min: 0.1,
      step: 0.1,
    },
    {
      name: 'floor',
      label: 'Этаж',
      type: 'number',
      placeholder: 'Например, 8',
      min: 1,
      step: 1,
    },
  ],
  electronics: [
    {
      name: 'type',
      label: 'Тип',
      type: 'select',
      placeholder: 'Выберите тип товара',
      options: [
        { value: 'phone', label: 'Телефон' },
        { value: 'laptop', label: 'Ноутбук' },
        { value: 'misc', label: 'Другое' },
      ],
    },
    {
      name: 'brand',
      label: 'Бренд',
      type: 'text',
      placeholder: 'Например, Apple',
    },
    {
      name: 'model',
      label: 'Модель',
      type: 'text',
      placeholder: 'Например, MacBook Pro',
    },
    {
      name: 'condition',
      label: 'Состояние',
      type: 'select',
      placeholder: 'Выберите состояние',
      options: [
        { value: 'new', label: 'Новый' },
        { value: 'used', label: 'Б/у' },
      ],
    },
    {
      name: 'color',
      label: 'Цвет',
      type: 'text',
      placeholder: 'Например, Чёрный',
    },
  ],
};

function isMissingFieldValue(value: unknown) {
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  return value === null || value === undefined;
}

export function getItemMissingCharacteristicFields(item: Item) {
  const params = item.params as Record<string, unknown>;

  return fieldConfigsByCategory[item.category]
    .filter(field => isMissingFieldValue(params[field.name]))
    .map(field => field.label);
}
