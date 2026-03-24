import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Grid,
  Group,
  Image,
  List,
  Paper,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';
import placeholderImage from '../assets/placeholder-image.png';
import { getItemById, itemQueryKeys } from '../shared/api/items.ts';
import { getSavedAdsListLocation } from '../shared/adsListLocation.ts';
import { getItemMissingCharacteristicFields } from '../shared/itemFields.ts';
import type { Item, ItemCategory } from '../shared/types/item.ts';

const categoryLabels: Record<ItemCategory, string> = {
  auto: 'Авто',
  real_estate: 'Недвижимость',
  electronics: 'Электроника',
};

const transmissionLabels = {
  automatic: 'Автоматическая',
  manual: 'Механическая',
} as const;

const realEstateTypeLabels = {
  flat: 'Квартира',
  house: 'Дом',
  room: 'Комната',
} as const;

const electronicsTypeLabels = {
  phone: 'Телефон',
  laptop: 'Ноутбук',
  misc: 'Другое',
} as const;

const conditionLabels = {
  new: 'Новый',
  used: 'Б/у',
} as const;

type Characteristic = {
  label: string;
  value: string;
};

type ItemWithLegacyPhotos = Item & {
  photos?: string[];
};

function formatPrice(price: number | null) {
  if (price === null) {
    return 'Цена не указана';
  }

  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function getItemPhotos(item: Item) {
  const legacyPhotos = (item as ItemWithLegacyPhotos).photos;
  const rawPhotos = item.images?.length ? item.images : legacyPhotos ?? [];

  return rawPhotos.filter(
    (photo): photo is string => typeof photo === 'string' && photo.trim().length > 0,
  );
}

function pushCharacteristic(
  characteristics: Characteristic[],
  label: string,
  value: string | number | null | undefined,
) {
  if (value === null || value === undefined || value === '') {
    return;
  }

  characteristics.push({
    label,
    value: String(value),
  });
}

function getCharacteristics(item: Item): Characteristic[] {
  const characteristics: Characteristic[] = [
    {
      label: 'Категория',
      value: categoryLabels[item.category],
    },
  ];

  if (item.category === 'auto') {
    pushCharacteristic(characteristics, 'Марка', item.params.brand);
    pushCharacteristic(characteristics, 'Модель', item.params.model);
    pushCharacteristic(characteristics, 'Год выпуска', item.params.yearOfManufacture);
    pushCharacteristic(
      characteristics,
      'Коробка передач',
      item.params.transmission
        ? transmissionLabels[item.params.transmission]
        : undefined,
    );
    pushCharacteristic(
      characteristics,
      'Пробег',
      item.params.mileage ? `${item.params.mileage} км` : undefined,
    );
    pushCharacteristic(
      characteristics,
      'Мощность двигателя',
      item.params.enginePower ? `${item.params.enginePower} л.с.` : undefined,
    );
  }

  if (item.category === 'real_estate') {
    pushCharacteristic(
      characteristics,
      'Тип недвижимости',
      item.params.type ? realEstateTypeLabels[item.params.type] : undefined,
    );
    pushCharacteristic(characteristics, 'Адрес', item.params.address);
    pushCharacteristic(
      characteristics,
      'Площадь',
      item.params.area ? `${item.params.area} м²` : undefined,
    );
    pushCharacteristic(
      characteristics,
      'Этаж',
      item.params.floor,
    );
  }

  if (item.category === 'electronics') {
    pushCharacteristic(
      characteristics,
      'Тип',
      item.params.type ? electronicsTypeLabels[item.params.type] : undefined,
    );
    pushCharacteristic(characteristics, 'Бренд', item.params.brand);
    pushCharacteristic(characteristics, 'Модель', item.params.model);
    pushCharacteristic(
      characteristics,
      'Состояние',
      item.params.condition ? conditionLabels[item.params.condition] : undefined,
    );
    pushCharacteristic(characteristics, 'Цвет', item.params.color);
  }

  return characteristics;
}

function AdDetailsSkeleton() {
  return (
    <Stack gap="xl">
      <Paper withBorder radius="xl" p="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap="sm">
            <Skeleton height={34} width={320} radius="sm" />
            <Skeleton height={36} width={144} radius="md" />
          </Stack>

          <Stack gap="xs" align="flex-end">
            <Skeleton height={38} width={180} radius="sm" />
            <Skeleton height={18} width={190} radius="sm" />
            <Skeleton height={18} width={210} radius="sm" />
          </Stack>
        </Group>
      </Paper>

      <Paper withBorder radius="xl" p="xl">
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="lg">
              <Skeleton height={420} radius="lg" />
              <Skeleton height={120} radius="lg" />
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="lg">
              <Skeleton height={132} radius="lg" />
              <Skeleton height={240} radius="lg" />
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>
    </Stack>
  );
}

export function AdDetailsPage() {
  const { id } = useParams();
  const itemId = Number(id);
  const isValidItemId = Number.isInteger(itemId) && itemId > 0;
  const adsListLocation = getSavedAdsListLocation();

  const itemQuery = useQuery({
    queryKey: itemQueryKeys.detail(itemId),
    queryFn: () => getItemById(itemId),
    enabled: isValidItemId,
  });

  if (!isValidItemId) {
    return (
      <Alert color="red" title="Некорректный идентификатор объявления">
        Проверьте адрес страницы или вернитесь к списку объявлений.
      </Alert>
    );
  }

  if (itemQuery.isPending) {
    return <AdDetailsSkeleton />;
  }

  if (itemQuery.isError || !itemQuery.data) {
    return (
      <Stack gap="lg">
        <Alert color="red" title="Не удалось загрузить объявление">
          Попробуйте обновить страницу или вернуться к списку объявлений.
        </Alert>

        <Button variant="default" component={Link} to={adsListLocation} w="fit-content">
          К объявлениям
        </Button>
      </Stack>
    );
  }

  const item = itemQuery.data;
  const characteristics = getCharacteristics(item);
  const missingFields = getItemMissingCharacteristicFields(item);
  const description = item.description?.trim();
  const photos = getItemPhotos(item);
  const [mainPhoto, ...secondaryPhotos] =
    photos.length > 0 ? photos : [placeholderImage];

  return (
    <Stack gap="xl">
      <Paper withBorder radius="xl" p="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap="sm">
            <Title order={1}>{item.title}</Title>
            <Group gap="sm">
              <Button
                variant="default"
                component={Link}
                to={adsListLocation}
                w="fit-content"
              >
                На главную
              </Button>
              <Button
                variant="default"
                component={Link}
                to={`/ads/${item.id}/edit`}
                w="fit-content"
              >
                Редактировать
              </Button>
            </Group>
          </Stack>

          <Stack gap={6} align="flex-end">
            <Text size="2rem" fw={700}>
              {formatPrice(item.price)}
            </Text>
            <Text c="dimmed">Опубликовано: {formatDate(item.createdAt)}</Text>
            <Text c="dimmed">Отредактировано: {formatDate(item.updatedAt)}</Text>
          </Stack>
        </Group>
      </Paper>

      <Paper withBorder radius="xl" p="xl">
        <Grid gutter="xl" align="start">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="lg">
              <Image
                src={mainPhoto}
                alt={item.title}
                radius="lg"
                h={420}
                fit="cover"
              />

              {secondaryPhotos.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    overflowX: 'auto',
                    paddingBottom: '0.25rem',
                  }}
                >
                  {secondaryPhotos.map((photo, index) => (
                    <Image
                      key={`${photo}-${index}`}
                      src={photo}
                      alt={`${item.title} ${index + 2}`}
                      radius="md"
                      h={112}
                      w={148}
                      miw={148}
                      fit="cover"
                    />
                  ))}
                </div>
              ) : null}

              <Card withBorder radius="lg" padding="lg">
                <Stack gap="xs">
                  <Text fw={600}>Описание</Text>
                  <Text c={description ? undefined : 'dimmed'}>
                    {description || 'Отсутствует'}
                  </Text>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="lg">
              {missingFields.length > 0 ? (
                <Paper
                  radius="lg"
                  p="lg"
                  style={{
                    backgroundColor: '#FFF7E8',
                    border: '1px solid #FFE7BA',
                  }}
                >
                  <Stack gap="sm">
                    <Group gap="xs" align="center">
                      <ThemeIcon variant="light" color="orange" radius="xl" size="sm">
                        <IconAlertCircle size={14} />
                      </ThemeIcon>
                      <Text fw={600} c="#AD6800">
                        Требуются доработки
                      </Text>
                    </Group>

                    <Text c="dark.7">У объявления не заполнены поля:</Text>

                    <List spacing={4} pl="md">
                      {missingFields.map(field => (
                        <List.Item key={field}>{field}</List.Item>
                      ))}
                    </List>
                  </Stack>
                </Paper>
              ) : null}

              <Card
                padding={0}
                bg="transparent"
                style={{ alignSelf: 'flex-start', width: '100%', maxWidth: '23rem' }}
              >
                <Stack gap="md">
                  <Text fw={600}>Характеристики</Text>

                  {characteristics.map(characteristic => (
                    <Group
                      key={characteristic.label}
                      gap="sm"
                      justify="flex-start"
                      align="flex-start"
                      wrap="nowrap"
                    >
                      <Text c="dimmed" style={{ minWidth: '9rem', flexShrink: 0 }}>
                        {characteristic.label}
                      </Text>
                      <Text fw={500}>
                        {characteristic.value}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>
    </Stack>
  );
}
