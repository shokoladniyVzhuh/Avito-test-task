export const itemCategories = ['auto', 'real_estate', 'electronics'] as const;

export type ItemCategory = (typeof itemCategories)[number];

export type AutoItemParams = {
  brand?: string;
  model?: string;
  yearOfManufacture?: number | string;
  transmission?: 'automatic' | 'manual';
  mileage?: number;
  enginePower?: number;
};

export type RealEstateItemParams = {
  type?: 'flat' | 'house' | 'room';
  address?: string;
  area?: number;
  floor?: number;
};

export type ElectronicsItemParams = {
  type?: 'phone' | 'laptop' | 'misc';
  brand?: string;
  model?: string;
  condition?: 'new' | 'used';
  color?: string;
};

type ItemBase = {
  id: number;
  title: string;
  description?: string;
  price: number | null;
  images?: string[];
  createdAt: string;
  updatedAt: string;
  needsRevision?: boolean;
  missingFields?: string[];
};

export type Item = ItemBase &
  (
    | {
        category: 'auto';
        params: AutoItemParams;
      }
    | {
        category: 'real_estate';
        params: RealEstateItemParams;
      }
    | {
        category: 'electronics';
        params: ElectronicsItemParams;
      }
  );

export type ItemCard = Pick<
  Item,
  'id' | 'category' | 'title' | 'price' | 'needsRevision' | 'missingFields'
>;

export type ItemSortColumn = 'title' | 'createdAt' | 'price';
export type SortDirection = 'asc' | 'desc';

export type ItemsListQuery = {
  q?: string;
  limit?: number;
  skip?: number;
  categories?: ItemCategory[];
  needsRevision?: boolean;
  sortColumn?: ItemSortColumn;
  sortDirection?: SortDirection;
};

export type ItemsListResponse = {
  items: ItemCard[];
  total: number;
};

export type UpdateItemPayload = Omit<Item, 'id' | 'createdAt' | 'updatedAt'>;
