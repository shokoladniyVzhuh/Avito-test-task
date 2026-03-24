import type { Item } from './types.ts';

function isMissingValue(value: unknown) {
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  return value === null || value === undefined;
}

function collectMissingFields(
  source: Record<string, unknown>,
  fieldLabels: Record<string, string>,
  missingFields: string[],
) {
  Object.entries(fieldLabels).forEach(([fieldName, fieldLabel]) => {
    if (isMissingValue(source[fieldName])) {
      missingFields.push(fieldLabel);
    }
  });
}

export function getItemMissingFields(item: Item): string[] {
  const missingFields: string[] = [];

  collectMissingFields(
    item as Record<string, unknown>,
    {
      title: 'Название',
      price: 'Цена',
      description: 'Описание',
    },
    missingFields,
  );

  if (item.category === 'auto') {
    collectMissingFields(
      item.params as Record<string, unknown>,
      {
        brand: 'Марка',
        model: 'Модель',
        yearOfManufacture: 'Год выпуска',
        transmission: 'Коробка передач',
        mileage: 'Пробег',
        enginePower: 'Мощность двигателя',
      },
      missingFields,
    );

    return missingFields;
  }

  if (item.category === 'real_estate') {
    collectMissingFields(
      item.params as Record<string, unknown>,
      {
        type: 'Тип недвижимости',
        address: 'Адрес',
        area: 'Площадь',
        floor: 'Этаж',
      },
      missingFields,
    );

    return missingFields;
  }

  collectMissingFields(
    item.params as Record<string, unknown>,
    {
      type: 'Тип',
      brand: 'Бренд',
      model: 'Модель',
      condition: 'Состояние',
      color: 'Цвет',
    },
    missingFields,
  );

  return missingFields;
}

export const doesItemNeedRevision = (item: Item): boolean =>
  getItemMissingFields(item).length > 0;
