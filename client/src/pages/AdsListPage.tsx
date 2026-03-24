import { useQuery } from '@tanstack/react-query';
import {
  IconChevronLeft,
  IconChevronRight,
  IconLayoutGrid,
  IconListDetails,
} from '@tabler/icons-react';
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Grid,
  Group,
  Image,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import placeholderImage from '../assets/placeholder-image.png';
import { getItems, itemQueryKeys } from '../shared/api/items.ts';
import { saveAdsListLocation } from '../shared/adsListLocation.ts';
import {
  itemCategories,
  type ItemCategory,
  type ItemSortColumn,
  type SortDirection,
} from '../shared/types/item.ts';

const PAGE_SIZE = 10;
const UNPAGINATED_LIMIT = 1000;
const defaultSortValue = 'createdAt-desc';
const defaultViewMode = 'grid';

const categoryLabels: Record<ItemCategory, string> = {
  auto: 'Авто',
  real_estate: 'Недвижимость',
  electronics: 'Электроника',
};

const sortOptions = [
  { value: 'title-asc', label: 'Название: А → Я' },
  { value: 'title-desc', label: 'Название: Я → А' },
  { value: 'createdAt-desc', label: 'Новизна: сначала новые' },
  { value: 'createdAt-asc', label: 'Новизна: сначала старые' },
  { value: 'price-asc', label: 'Цена: сначала дешевле' },
  { value: 'price-desc', label: 'Цена: сначала дороже' },
] as const;

type ViewMode = 'grid' | 'list';

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getAdsCountLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} объявление`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} объявления`;
  }

  return `${count} объявлений`;
}

function getSortQuery(value: string): {
  sortColumn: ItemSortColumn;
  sortDirection: SortDirection;
} {
  const [sortColumn, sortDirection] = value.split('-') as [
    ItemSortColumn,
    SortDirection,
  ];

  return { sortColumn, sortDirection };
}

function formatPrice(price: number | null) {
  if (price === null) {
    return 'Цена не указана';
  }

  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

function isValidCategory(value: string): value is ItemCategory {
  return itemCategories.includes(value as ItemCategory);
}

function isValidSortValue(value: string) {
  return sortOptions.some(option => option.value === value);
}

function isValidViewMode(value: string | null): value is ViewMode {
  return value === 'grid' || value === 'list';
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const maxVisiblePages = 10;
  const windowEnd = Math.min(
    totalPages,
    Math.max(maxVisiblePages, currentPage + 2),
  );
  const windowStart = Math.max(1, windowEnd - maxVisiblePages + 1);

  return Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, index) => windowStart + index,
  );
}

function ProductCardSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'list') {
    return (
      <Card withBorder radius="lg" padding="md">
        <Group align="stretch" wrap="nowrap">
          <Skeleton height={108} width={132} radius="md" />
          <Stack gap="sm" style={{ flex: 1 }}>
            <Skeleton height={12} width="22%" />
            <Skeleton height={18} width="62%" />
            <Skeleton height={14} width="34%" />
            <Skeleton height={12} width="30%" mt="auto" />
          </Stack>
        </Group>
      </Card>
    );
  }

  return (
    <Card withBorder radius="lg" padding="md">
      <Stack gap="sm">
        <Skeleton height={112} radius="md" />
        <Skeleton height={10} width="42%" />
        <Skeleton height={18} width="92%" />
        <Skeleton height={14} width="58%" />
        <Skeleton height={10} width="36%" mt="auto" />
      </Stack>
    </Card>
  );
}

export function AdsListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);

  const selectedCategories = useMemo(
    () => searchParams.getAll('category').filter(isValidCategory),
    [searchParams],
  );
  const needsRevision = searchParams.get('needsRevision') === 'true';
  const searchQuery = searchParams.get('q') ?? '';
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const paginationEnabled = searchParams.get('pagination') !== 'false';
  const requestedViewMode = searchParams.get('view');
  const viewMode: ViewMode = isValidViewMode(requestedViewMode)
    ? requestedViewMode
    : defaultViewMode;

  const requestedSortValue = `${searchParams.get('sortColumn') ?? 'createdAt'}-${
    searchParams.get('sortDirection') ?? 'desc'
  }`;
  const sortValue = isValidSortValue(requestedSortValue)
    ? requestedSortValue
    : defaultSortValue;
  const { sortColumn, sortDirection } = getSortQuery(sortValue);

  const [searchValue, setSearchValue] = useState(searchQuery);

  useEffect(() => {
    setSearchValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    saveAdsListLocation(location.pathname, location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedValue = searchValue.trim();

      if (normalizedValue === searchQuery) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams);

      if (normalizedValue) {
        nextParams.set('q', normalizedValue);
      } else {
        nextParams.delete('q');
      }

      nextParams.set('page', '1');
      setSearchParams(nextParams, { replace: true });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchParams, searchQuery, searchValue, setSearchParams]);

  const query = useMemo(
    () => ({
      q: searchQuery || undefined,
      limit: paginationEnabled ? PAGE_SIZE : UNPAGINATED_LIMIT,
      skip: paginationEnabled ? (page - 1) * PAGE_SIZE : 0,
      categories: selectedCategories.length ? selectedCategories : undefined,
      needsRevision: needsRevision || undefined,
      sortColumn,
      sortDirection,
    }),
    [
      needsRevision,
      page,
      paginationEnabled,
      searchQuery,
      selectedCategories,
      sortColumn,
      sortDirection,
    ],
  );

  const itemsQuery = useQuery({
    queryKey: itemQueryKeys.list(query),
    queryFn: ({ signal }) => getItems(query, signal),
    placeholderData: previousData => previousData,
  });

  const totalItems = itemsQuery.data?.total ?? 0;
  const items = itemsQuery.data?.items ?? [];
  const totalPages = paginationEnabled
    ? Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
    : 1;

  useEffect(() => {
    if (paginationEnabled && totalItems > 0 && page > totalPages) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('page', String(totalPages));
      setSearchParams(nextParams, { replace: true });
    }
  }, [page, paginationEnabled, searchParams, setSearchParams, totalItems, totalPages]);

  const updateParams = (
    updater: (params: URLSearchParams) => void,
    options?: { replace?: boolean },
  ) => {
    const nextParams = new URLSearchParams(searchParams);
    updater(nextParams);
    setSearchParams(nextParams, options);
  };

  const handleCategoryToggle = (category: ItemCategory) => {
    updateParams(params => {
      const categorySet = new Set(params.getAll('category'));

      if (categorySet.has(category)) {
        categorySet.delete(category);
      } else {
        categorySet.add(category);
      }

      params.delete('category');
      Array.from(categorySet)
        .filter(isValidCategory)
        .forEach(value => params.append('category', value));
      params.set('page', '1');
    });
  };

  const handleNeedsRevisionChange = (checked: boolean) => {
    updateParams(params => {
      if (checked) {
        params.set('needsRevision', 'true');
      } else {
        params.delete('needsRevision');
      }

      params.set('page', '1');
    });
  };

  const handleSortChange = (value: string | null) => {
    const nextSortValue = value && isValidSortValue(value) ? value : defaultSortValue;
    const nextSortQuery = getSortQuery(nextSortValue);

    updateParams(params => {
      params.set('sortColumn', nextSortQuery.sortColumn);
      params.set('sortDirection', nextSortQuery.sortDirection);
      params.set('page', '1');
    });
  };

  const handleViewChange = (nextViewMode: ViewMode) => {
    updateParams(
      params => {
        if (nextViewMode === defaultViewMode) {
          params.delete('view');
        } else {
          params.set('view', nextViewMode);
        }
      },
      { replace: true },
    );
  };

  const handlePaginationToggle = () => {
    updateParams(
      params => {
        if (paginationEnabled) {
          params.set('pagination', 'false');
          params.delete('page');
        } else {
          params.delete('pagination');
          params.set('page', '1');
        }
      },
      { replace: true },
    );
  };

  const handleResetFilters = () => {
    setSearchValue('');
    const nextParams = new URLSearchParams({
      page: '1',
      sortColumn: 'createdAt',
      sortDirection: 'desc',
    });

    if (viewMode !== defaultViewMode) {
      nextParams.set('view', viewMode);
    }

    if (!paginationEnabled) {
      nextParams.set('pagination', 'false');
    }

    setSearchParams(nextParams);
  };

  const isLoading = itemsQuery.isPending && !itemsQuery.data;
  const countLabel = isLoading ? 'Загрузка объявлений...' : getAdsCountLabel(totalItems);
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);

  const handlePageChange = (nextPage: number) => {
    updateParams(params => {
      params.set('page', String(nextPage));
    });
  };

  return (
    <Stack gap="xl">
      <div>
        <Title order={1}>Мои объявления</Title>
        <Text c="dimmed">{countLabel}</Text>
      </div>

      <Paper withBorder radius="xl" p="lg" className="upper-container">
        <Group align="end" wrap="wrap">
          <TextInput
            className="upper-control"
            style={{ flex: 1 }}
            miw={420}
            label="Поиск"
            placeholder="Поиск по объявлениям"
            value={searchValue}
            onChange={event => setSearchValue(event.currentTarget.value)}
          />

          <div className="upper-control-wrapper">
            <Button
              className={`upper-control-button ${paginationEnabled ? 'is-active' : ''}`}
              variant="subtle"
              h={36}
              px="md"
              onClick={handlePaginationToggle}
            >
              Пагинация
            </Button>
          </div>

          <div className="upper-control-wrapper">
            <Group gap="xs" wrap="nowrap">
              <ActionIcon
                className={`upper-control-icon ${viewMode === 'grid' ? 'is-active' : ''}`}
                w={50}
                h={36}
                radius="md"
                variant="subtle"
                aria-label="Сетка"
                onClick={() => handleViewChange('grid')}
              >
                <IconLayoutGrid size={20} />
              </ActionIcon>
              <ActionIcon
                className={`upper-control-icon ${viewMode === 'list' ? 'is-active' : ''}`}
                w={50}
                h={36}
                radius="md"
                variant="subtle"
                aria-label="Список"
                onClick={() => handleViewChange('list')}
              >
                <IconListDetails size={20} />
              </ActionIcon>
            </Group>
          </div>

          <Select
            className="upper-control"
            label="Сортировка"
            miw={300}
            data={sortOptions.map(option => ({
              value: option.value,
              label: option.label,
            }))}
            value={sortValue}
            onChange={handleSortChange}
            allowDeselect={false}
          />
        </Group>
      </Paper>

      <Grid gutter="lg" align="start">
        <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
          <Paper withBorder radius="xl" p="lg" className="filters-container">
            <Stack gap="lg">
              <div>
                <Text fw={600}>Фильтры</Text>
              </div>

              <Card withBorder radius="lg" padding="md" className="filter-card">
                <Stack gap="sm">
                  <Group
                    justify="space-between"
                    wrap="nowrap"
                    className="filter-card-toggle"
                    onClick={() => setIsCategoriesExpanded(current => !current)}
                  >
                    <Text fw={500}>Категории</Text>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label={
                        isCategoriesExpanded ? 'Свернуть категории' : 'Развернуть категории'
                      }
                    >
                      <IconChevronRight
                        size={18}
                        className={
                          isCategoriesExpanded
                            ? 'filter-card-toggle-icon is-expanded'
                            : 'filter-card-toggle-icon'
                        }
                      />
                    </ActionIcon>
                  </Group>
                  <Collapse in={isCategoriesExpanded}>
                    <Stack gap="sm" pt="xs">
                      {itemCategories.map(category => (
                        <Checkbox
                          key={category}
                          label={categoryLabels[category]}
                          value={category}
                          checked={selectedCategories.includes(category)}
                          onChange={() => handleCategoryToggle(category)}
                        />
                      ))}
                    </Stack>
                  </Collapse>
                </Stack>
              </Card>

              <Divider />

              <Card withBorder radius="lg" padding="md" className="filter-card">
                <Stack gap="sm">
                  <Text fw={500}>Статус объявления</Text>
                  <Switch
                    label="Только требующие доработок"
                    labelPosition="left"
                    checked={needsRevision}
                    onChange={event =>
                      handleNeedsRevisionChange(event.currentTarget.checked)
                    }
                  />
                </Stack>
              </Card>
            </Stack>
          </Paper>
          <Button
            className="reset-filters-button"
            variant="default"
            fullWidth
            onClick={handleResetFilters}
            style={{ marginTop: '1rem' }}
          >
            Сбросить фильтры
          </Button>
        </Grid.Col>

        

        <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
          <Stack gap="lg">
            {itemsQuery.isError ? (
              <Alert color="red" title="Не удалось загрузить объявления">
                Попробуйте обновить страницу.
              </Alert>
            ) : null}

            {isLoading ? (
              viewMode === 'grid' ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="md">
                  {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <ProductCardSkeleton key={index} viewMode={viewMode} />
                  ))}
                </SimpleGrid>
              ) : (
                <Stack gap="md">
                  {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <ProductCardSkeleton key={index} viewMode={viewMode} />
                  ))}
                </Stack>
              )
            ) : null}

            {!isLoading && !itemsQuery.isError && items.length === 0 ? (
              <Paper radius="lg" p="xl" className="plain-surface">
                <Stack gap="xs" align="center">
                  <Title order={3}>Ничего не найдено</Title>
                  <Text c="dimmed" ta="center">
                    Измените параметры фильтрации или сбросьте фильтры, чтобы
                    увидеть объявления.
                  </Text>
                  <Button variant="light" onClick={handleResetFilters}>
                    Сбросить фильтры
                  </Button>
                </Stack>
              </Paper>
            ) : null}

            {!isLoading && !itemsQuery.isError && items.length > 0 ? (
              <>
                {viewMode === 'grid' ? (
                  <SimpleGrid
                    cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
                    spacing="md"
                  >
                    {items.map(item => {
                      const hasMissingFields =
                        (item.missingFields?.length ?? 0) > 0 || Boolean(item.needsRevision);

                      return (
                        <Card
                          key={item.id}
                          component={Link}
                          to={`/ads/${item.id}`}
                          withBorder
                          radius="lg"
                          padding="md"
                          className="product-card"
                        >
                          <Stack gap="sm" h="100%">
                            <Image
                              src={placeholderImage}
                              alt={item.title}
                              h={112}
                              radius="md"
                              fit="cover"
                            />

                            <div>
                              {item.category ? (
                                <Text size="sm" c="dimmed" mb={6}>
                                  {categoryLabels[item.category]}
                                </Text>
                              ) : null}
                              <Text fw={600} size="sm" lineClamp={2}>
                                {item.title}
                              </Text>
                              <Text size="lg" fw={700} mt={6}>
                                {formatPrice(item.price)}
                              </Text>
                            </div>

                            {hasMissingFields ? (
                              <Text className="revision-badge" component="span" mt="auto">
                                Требует доработки
                              </Text>
                            ) : null}
                          </Stack>
                        </Card>
                      );
                    })}
                  </SimpleGrid>
                ) : (
                  <Stack gap="md">
                    {items.map(item => {
                      const hasMissingFields =
                        (item.missingFields?.length ?? 0) > 0 || Boolean(item.needsRevision);

                      return (
                        <Card
                          key={item.id}
                          component={Link}
                          to={`/ads/${item.id}`}
                          withBorder
                          radius="lg"
                          padding="md"
                          className="product-card"
                        >
                          <Group align="stretch" wrap="nowrap">
                            <Image
                              src={placeholderImage}
                              alt={item.title}
                              h={108}
                              w={132}
                              miw={132}
                              radius="md"
                              fit="cover"
                            />

                            <Stack gap="sm" style={{ flex: 1 }} h="100%">
                              <div>
                                {item.category ? (
                                  <Text size="sm" c="dimmed" mb={6}>
                                    {categoryLabels[item.category]}
                                  </Text>
                                ) : null}
                                <Text fw={600} lineClamp={2}>
                                  {item.title}
                                </Text>
                                <Text size="xl" fw={700} mt={8}>
                                  {formatPrice(item.price)}
                                </Text>
                              </div>

                              {hasMissingFields ? (
                                <Text className="revision-badge" component="span" mt="auto">
                                  Требует доработки
                                </Text>
                              ) : null}
                            </Stack>
                          </Group>
                        </Card>
                      );
                    })}
                  </Stack>
                )}

                {paginationEnabled && totalItems > PAGE_SIZE ? (
                  <Group justify="center" gap="xs" wrap="nowrap">
                    <ActionIcon
                      className="pagination-button"
                      variant="subtle"
                      size={36}
                      radius="md"
                      aria-label="Предыдущая страница"
                      disabled={page <= 1}
                      onClick={() => handlePageChange(page - 1)}
                    >
                      <IconChevronLeft size={18} />
                    </ActionIcon>

                    {visiblePages.map(pageNumber => (
                      <Button
                        key={pageNumber}
                        className={`pagination-button ${pageNumber === page ? 'is-active' : ''}`}
                        variant="subtle"
                        h={36}
                        miw={36}
                        px="sm"
                        radius="md"
                        onClick={() => handlePageChange(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    ))}

                    <ActionIcon
                      className="pagination-button"
                      variant="subtle"
                      size={36}
                      radius="md"
                      aria-label="Следующая страница"
                      disabled={page >= totalPages}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      <IconChevronRight size={18} />
                    </ActionIcon>
                  </Group>
                ) : null}
              </>
            ) : null}
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
