import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconMessageCircle, IconRefresh, IconSparkles, IconX } from '@tabler/icons-react';
import {
  Alert,
  Button,
  Card,
  CloseButton,
  Grid,
  Group,
  Loader,
  NumberInput,
  Paper,
  Popover,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  askItemQuestion,
  type AiChatMessage,
  generateDescriptionSuggestion,
  generatePriceSuggestion,
  type AiItemInput,
} from '../shared/api/ai.ts';
import {
  getItemById,
  itemQueryKeys,
  updateItem,
} from '../shared/api/items.ts';
import {
  itemCategories,
  type Item,
  type ItemCategory,
  type UpdateItemPayload,
} from '../shared/types/item.ts';
import { fieldConfigsByCategory } from '../shared/itemFields.ts';

type EditFormValues = {
  category: ItemCategory | '';
  title: string;
  price: string;
  description: string;
  params: Record<string, string>;
};

type EditChatMessage = AiChatMessage & {
  id: string;
};

const categoryOptions = [
  { value: 'auto', label: 'Авто' },
  { value: 'real_estate', label: 'Недвижимость' },
  { value: 'electronics', label: 'Электроника' },
] as const;


const optionalWarningStyles = {
  input: { borderColor: '#FFA940' },
  label: { color: '#FFA940' },
  description: { color: '#FFA940' },
} as const;

function isItemCategory(value: string): value is ItemCategory {
  return itemCategories.includes(value as ItemCategory);
}

function isEmptyValue(value: string) {
  return value.trim().length === 0;
}

function toInputValue(value: string | number | null | undefined) {
  return value === null || value === undefined ? '' : String(value);
}

function getDraftStorageKey(itemId: number) {
  return `ad-edit-draft-${itemId}`;
}

function getChatStorageKey(itemId: number) {
  return `ad-edit-chat-${itemId}`;
}

function createChatMessage(role: AiChatMessage['role'], content: string): EditChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    role,
    content,
  };
}

function getInitialChatMessages() {
  return [createChatMessage('assistant', 'Привет! Чем я могу вам помочь?')];
}

function restoreChatMessages(storageKey: string) {
  if (typeof window === 'undefined') {
    return getInitialChatMessages();
  }

  const rawHistory = window.localStorage.getItem(storageKey);

  if (!rawHistory) {
    return getInitialChatMessages();
  }

  try {
    const parsedHistory = JSON.parse(rawHistory) as unknown;

    if (!Array.isArray(parsedHistory)) {
      return getInitialChatMessages();
    }

    const restoredHistory = parsedHistory.flatMap(entry => {
      if (!entry || typeof entry !== 'object') {
        return [];
      }

      const role = 'role' in entry ? entry.role : null;
      const content = 'content' in entry ? entry.content : null;

      if (
        (role !== 'user' && role !== 'assistant') ||
        typeof content !== 'string' ||
        content.trim().length === 0
      ) {
        return [];
      }

      return [
        {
          id:
            'id' in entry && typeof entry.id === 'string'
              ? entry.id
              : `${role}-${Math.random().toString(36).slice(2, 10)}`,
          role,
          content,
        } satisfies EditChatMessage,
      ];
    });

    return restoredHistory.length > 0 ? restoredHistory : getInitialChatMessages();
  } catch {
    return getInitialChatMessages();
  }
}

function buildEmptyParams(category: ItemCategory) {
  return Object.fromEntries(
    fieldConfigsByCategory[category].map(field => [field.name, '']),
  );
}

function createFormValues(item: Item): EditFormValues {
  const params = buildEmptyParams(item.category);
  const sourceParams = item.params as Record<string, string | number | undefined>;

  fieldConfigsByCategory[item.category].forEach(field => {
    params[field.name] = toInputValue(sourceParams[field.name]);
  });

  return {
    category: item.category,
    title: item.title,
    price: toInputValue(item.price),
    description: item.description ?? '',
    params,
  };
}

function restoreDraft(item: Item, storageKey: string) {
  const initialValues = createFormValues(item);

  if (typeof window === 'undefined') {
    return { values: initialValues, restored: false };
  }

  const rawDraft = window.localStorage.getItem(storageKey);

  if (!rawDraft) {
    return { values: initialValues, restored: false };
  }

  try {
    const parsedDraft = JSON.parse(rawDraft) as
      | {
          category?: unknown;
          title?: unknown;
          price?: unknown;
          description?: unknown;
          params?: Record<string, unknown>;
        }
      | null;

    if (!parsedDraft || typeof parsedDraft !== 'object') {
      return { values: initialValues, restored: false };
    }

    const draftCategory =
      typeof parsedDraft.category === 'string' ? parsedDraft.category : '';
    const nextCategory = isItemCategory(draftCategory) ? draftCategory : item.category;
    const nextParams = buildEmptyParams(nextCategory);
    const draftParams = parsedDraft.params ?? {};

    fieldConfigsByCategory[nextCategory].forEach(field => {
      const fieldValue = draftParams[field.name];
      nextParams[field.name] =
        typeof fieldValue === 'string' || typeof fieldValue === 'number'
          ? String(fieldValue)
          : '';
    });

    return {
      values: {
        category: nextCategory,
        title: typeof parsedDraft.title === 'string' ? parsedDraft.title : initialValues.title,
        price:
          typeof parsedDraft.price === 'string' || typeof parsedDraft.price === 'number'
            ? String(parsedDraft.price)
            : initialValues.price,
        description:
          typeof parsedDraft.description === 'string'
            ? parsedDraft.description
            : initialValues.description,
        params: nextParams,
      },
      restored: true,
    };
  } catch {
    return { values: initialValues, restored: false };
  }
}

function parseNumericValue(value: string) {
  if (isEmptyValue(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPayload(values: EditFormValues & { category: ItemCategory }): UpdateItemPayload {
  const paramEntries: Array<[string, string | number]> = [];

  fieldConfigsByCategory[values.category].forEach(field => {
    const rawValue = values.params[field.name] ?? '';

    if (isEmptyValue(rawValue)) {
      return;
    }

    paramEntries.push([
      field.name,
      field.type === 'number' ? Number(rawValue) : rawValue.trim(),
    ]);
  });

  const params = Object.fromEntries(paramEntries);

  return {
    category: values.category,
    title: values.title.trim(),
    description: values.description.trim(),
    price: Number(values.price),
    params,
  } as UpdateItemPayload;
}

function buildAiItemInput(values: EditFormValues & { category: ItemCategory }): AiItemInput {
  const paramEntries: Array<[string, string | number]> = [];

  fieldConfigsByCategory[values.category].forEach(field => {
    const rawValue = values.params[field.name] ?? '';

    if (isEmptyValue(rawValue)) {
      return;
    }

    paramEntries.push([
      field.name,
      field.type === 'number' ? Number(rawValue) : rawValue.trim(),
    ]);
  });

  return {
    category: values.category,
    title: values.title.trim(),
    description: values.description.trim(),
    price: parseNumericValue(values.price),
    params: Object.fromEntries(paramEntries),
  };
}

function FieldClearButton({
  hidden,
  onClick,
}: {
  hidden: boolean;
  onClick: () => void;
}) {
  if (hidden) {
    return null;
  }

  return <CloseButton aria-label="Очистить поле" onClick={onClick} />;
}

function isEditableFormElement(element: EventTarget | null) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.getAttribute('role') === 'textbox' ||
    element.getAttribute('role') === 'combobox' ||
    element.isContentEditable
  );
}

const applyButtonStyles = {
  root: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #1F1F1F',
    color: '#1F1F1F',
    transition: 'background-color 150ms ease, color 150ms ease, border-color 150ms ease',
    '&:hover': {
      backgroundColor: '#1F1F1F',
      borderColor: '#1F1F1F',
      color: '#FFFFFF',
    },
  },
} as const;

export function AdEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement | null>(null);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);
  const itemId = Number(id);
  const isValidItemId = Number.isInteger(itemId) && itemId > 0;
  const draftStorageKey = getDraftStorageKey(itemId);
  const chatStorageKey = getChatStorageKey(itemId);

  const [formValues, setFormValues] = useState<EditFormValues | null>(null);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [draftRestored, setDraftRestored] = useState(false);
  const [isDescriptionPopoverOpened, setDescriptionPopoverOpened] = useState(false);
  const [isPricePopoverOpened, setPricePopoverOpened] = useState(false);
  const [chatMessages, setChatMessages] = useState<EditChatMessage[]>(() =>
    getInitialChatMessages(),
  );
  const [chatQuestion, setChatQuestion] = useState('');

  const itemQuery = useQuery({
    queryKey: itemQueryKeys.detail(itemId),
    queryFn: () => getItemById(itemId),
    enabled: isValidItemId,
  });

  useEffect(() => {
    if (!itemQuery.data) {
      return;
    }

    const restoredDraft = restoreDraft(itemQuery.data, draftStorageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the form is intentionally rehydrated when the loaded item or its draft changes.
    setFormValues(restoredDraft.values);
    setDraftRestored(restoredDraft.restored);
    setTouchedFields({});
  }, [draftStorageKey, itemQuery.data]);

  useEffect(() => {
    if (!itemQuery.data) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- the chat history is intentionally rehydrated when the loaded item changes.
    setChatMessages(restoreChatMessages(chatStorageKey));
    setChatQuestion('');
  }, [chatStorageKey, itemQuery.data]);

  useEffect(() => {
    if (!formValues || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(draftStorageKey, JSON.stringify(formValues));
  }, [draftStorageKey, formValues]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (chatMessages.length === 0) {
      window.localStorage.removeItem(chatStorageKey);
      return;
    }

    window.localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages));
  }, [chatMessages, chatStorageKey]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateItemPayload) => updateItem(itemId, payload),
    onSuccess: async () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(draftStorageKey);
      }

      await queryClient.invalidateQueries({ queryKey: itemQueryKeys.all });

      notifications.show({
        title: 'Изменения сохранены',
        message: 'Объявление успешно обновлено.',
        color: 'green',
        position: 'top-right',
      });

      navigate(`/ads/${itemId}`);
    },
    onError: () => {
      notifications.show({
        title: 'Ошибка сохранения',
        message:
          'При попытке сохранить изменения произошла ошибка. Попробуйте ещё раз или зайдите позже.',
        icon: <IconX size={16} />,
        withBorder: true,
        autoClose: 6000,
        position: 'top-right',
        styles: {
          root: {
            backgroundColor: '#FFCCC7',
            borderColor: '#FF7875',
          },
          title: {
            color: '#5c0011',
          },
          description: {
            color: '#5c0011',
          },
          icon: {
            backgroundColor: '#FFCCC7',
            color: '#5c0011',
          },
        },
      });
    },
  });

  const descriptionSuggestionMutation = useMutation({
    mutationFn: (input: AiItemInput) => generateDescriptionSuggestion(input),
    onSuccess: () => {
      setDescriptionPopoverOpened(true);
    },
    onError: () => {
      notifications.show({
        title: 'Не удалось получить описание',
        message: 'Попробуйте повторить запрос к AI ещё раз.',
        color: 'red',
        position: 'top-right',
      });
    },
  });

  const priceSuggestionMutation = useMutation({
    mutationFn: (input: AiItemInput) => generatePriceSuggestion(input),
    onSuccess: () => {
      setPricePopoverOpened(true);
    },
    onError: () => {
      notifications.show({
        title: 'Не удалось получить цену',
        message: 'Попробуйте повторить запрос к AI ещё раз.',
        color: 'red',
        position: 'top-right',
      });
    },
  });

  const itemQuestionMutation = useMutation({
    mutationFn: ({
      input,
      question,
      history,
    }: {
      input: AiItemInput;
      question: string;
      history: AiChatMessage[];
    }) => askItemQuestion(input, question, history),
    onSuccess: data => {
      setChatMessages(current => [...current, createChatMessage('assistant', data.answer)]);
    },
    onError: () => {
      notifications.show({
        title: 'Не удалось получить ответ AI',
        message: 'Попробуйте повторить вопрос ещё раз.',
        color: 'red',
        position: 'top-right',
      });
    },
  });

  useEffect(() => {
    const handleEnterKey = (event: KeyboardEvent) => {
      if (
        event.key !== 'Enter' ||
        event.shiftKey ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }

      const currentForm = formRef.current;
      const activeElement = document.activeElement;

      if (!currentForm) {
        return;
      }

      const activeInsideForm =
        activeElement instanceof HTMLElement && currentForm.contains(activeElement);
      const activeInsideChat =
        activeElement instanceof HTMLElement &&
        chatPanelRef.current instanceof HTMLElement &&
        chatPanelRef.current.contains(activeElement);

      if (activeInsideForm && activeElement instanceof HTMLTextAreaElement) {
        return;
      }

      if (activeInsideChat) {
        return;
      }

      if (activeInsideForm && isEditableFormElement(activeElement)) {
        event.preventDefault();
        activeElement.blur();
        return;
      }

      if (!activeInsideForm) {
        event.preventDefault();
        currentForm.requestSubmit();
      }
    };

    window.addEventListener('keydown', handleEnterKey);

    return () => {
      window.removeEventListener('keydown', handleEnterKey);
    };
  }, []);

  if (!isValidItemId) {
    return (
      <Alert color="red" title="Некорректный идентификатор объявления">
        Проверьте адрес страницы или вернитесь к объявлению.
      </Alert>
    );
  }

  if (itemQuery.isPending) {
    return (
      <Stack gap="xl">
        <div>
          <Skeleton height={36} width={320} mb="sm" />
          <Skeleton height={18} width={280} />
        </div>
        <Paper withBorder radius="xl" p="xl">
          <Stack gap="lg">
            <Skeleton height={72} radius="lg" />
            <Skeleton height={72} radius="lg" />
            <Skeleton height={72} radius="lg" />
            <Skeleton height={192} radius="lg" />
          </Stack>
        </Paper>
      </Stack>
    );
  }

  if (itemQuery.isError || !itemQuery.data) {
    return (
      <Stack gap="lg">
        <Alert color="red" title="Не удалось загрузить объявление">
          Попробуйте обновить страницу или вернуться к просмотру объявления.
        </Alert>

        <Button variant="default" component={Link} to={`/ads/${itemId}`} w="fit-content">
          К объявлению
        </Button>
      </Stack>
    );
  }

  if (!formValues) {
    return (
      <Stack gap="xl">
        <div>
          <Skeleton height={36} width={320} mb="sm" />
          <Skeleton height={18} width={280} />
        </div>
        <Paper withBorder radius="xl" p="xl">
          <Stack gap="lg">
            <Skeleton height={72} radius="lg" />
            <Skeleton height={72} radius="lg" />
            <Skeleton height={72} radius="lg" />
            <Skeleton height={192} radius="lg" />
          </Stack>
        </Paper>
      </Stack>
    );
  }

  const visibleParamFields =
    formValues.category === '' ? [] : fieldConfigsByCategory[formValues.category];
  const priceValue = parseNumericValue(formValues.price);
  const hasCategoryError = touchedFields.category && formValues.category === '';
  const hasTitleError = touchedFields.title && isEmptyValue(formValues.title);
  const hasPriceError =
    touchedFields.price && (priceValue === null || Number(formValues.price) < 0);
  const isSaveDisabled =
    formValues.category === '' ||
    isEmptyValue(formValues.title) ||
    priceValue === null ||
    priceValue < 0 ||
    updateMutation.isPending;
  const isAiDisabled = formValues.category === '' || isEmptyValue(formValues.title);
  const descriptionActionLabel = isEmptyValue(formValues.description)
    ? 'Придумать описание'
    : 'Улучшить описание';
  const descriptionTriggerLabel = descriptionSuggestionMutation.isPending
    ? 'Выполняется запрос'
    : descriptionSuggestionMutation.isSuccess || descriptionSuggestionMutation.isError
      ? 'Повторить запрос'
      : descriptionActionLabel;
  const priceTriggerLabel = priceSuggestionMutation.isPending
    ? 'Выполняется запрос'
    : priceSuggestionMutation.isSuccess || priceSuggestionMutation.isError
      ? 'Повторить запрос'
      : 'Узнать рыночную цену';
  const showDescriptionRetryState =
    !descriptionSuggestionMutation.isPending &&
    (descriptionSuggestionMutation.isSuccess || descriptionSuggestionMutation.isError);
  const showPriceRetryState =
    !priceSuggestionMutation.isPending &&
    (priceSuggestionMutation.isSuccess || priceSuggestionMutation.isError);
  const isChatSendDisabled =
    isAiDisabled || chatQuestion.trim().length === 0 || itemQuestionMutation.isPending;

  const markFieldTouched = (fieldKey: string) => {
    setTouchedFields(current => ({ ...current, [fieldKey]: true }));
  };

  const closeDescriptionPopover = () => {
    setDescriptionPopoverOpened(false);
    descriptionSuggestionMutation.reset();
  };

  const closePricePopover = () => {
    setPricePopoverOpened(false);
    priceSuggestionMutation.reset();
  };

  const handleCategoryChange = (value: string | null) => {
    const nextCategory = value && isItemCategory(value) ? value : '';

    setFormValues(current => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        category: nextCategory,
        params: nextCategory ? buildEmptyParams(nextCategory) : {},
      };
    });

    setTouchedFields(current =>
      Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith('params.'))),
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaveDisabled) {
      const nextTouchedFields: Record<string, boolean> = {
        ...touchedFields,
        category: true,
        title: true,
        price: true,
      };

      visibleParamFields.forEach(field => {
        nextTouchedFields[`params.${field.name}`] = true;
      });

      nextTouchedFields.description = true;
      setTouchedFields(nextTouchedFields);
      return;
    }

    if (formValues.category === '') {
      return;
    }

    const payloadValues: EditFormValues & { category: ItemCategory } = {
      ...formValues,
      category: formValues.category,
    };

    updateMutation.mutate(buildPayload(payloadValues));
  };

  const handleDescriptionSuggestion = () => {
    if (
      !formValues ||
      formValues.category === '' ||
      descriptionSuggestionMutation.isPending
    ) {
      return;
    }

    setDescriptionPopoverOpened(false);
    descriptionSuggestionMutation.mutate(
      buildAiItemInput({
        ...formValues,
        category: formValues.category,
      }),
    );
  };

  const handlePriceSuggestion = () => {
    if (!formValues || formValues.category === '' || priceSuggestionMutation.isPending) {
      return;
    }

    setPricePopoverOpened(false);
    priceSuggestionMutation.mutate(
      buildAiItemInput({
        ...formValues,
        category: formValues.category,
      }),
    );
  };

  const handleChatSubmit = () => {
    const normalizedQuestion = chatQuestion.trim();

    if (!formValues || formValues.category === '' || normalizedQuestion.length === 0) {
      return;
    }

    const history = chatMessages.map(({ role, content }) => ({ role, content }));

    setChatMessages(current => [...current, createChatMessage('user', normalizedQuestion)]);
    setChatQuestion('');

    itemQuestionMutation.mutate({
      input: buildAiItemInput({
        ...formValues,
        category: formValues.category,
      }),
      question: normalizedQuestion,
      history,
    });
  };

  const handleChatClear = () => {
    setChatMessages(getInitialChatMessages());
    setChatQuestion('');
    itemQuestionMutation.reset();
  };

  return (
    <Stack gap="xl">
      <div>
        <Title order={1}>Редактирование объявления</Title>
      </div>

      {draftRestored ? (
        <Alert color="blue" title="Черновик восстановлен">
          Последние несохраненные изменения были подгружены.
        </Alert>
      ) : null}

      <Paper withBorder radius="xl" p="xl">
        <Grid gutter="xl" align="flex-start">
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <form ref={formRef} onSubmit={handleSubmit}>
              <Stack gap="xl">
                <Select
                  label="Категория"
                  placeholder="Выберите категорию"
                  data={categoryOptions}
                  value={formValues.category || null}
                  onChange={handleCategoryChange}
                  onBlur={() => markFieldTouched('category')}
                  error={hasCategoryError ? 'Поле должно быть заполнено' : undefined}
                  clearable
                  searchable
                  withAsterisk
                />

                <TextInput
                  label="Название"
                  placeholder="Введите название объявления"
                  value={formValues.title}
                  onChange={event => {
                    const nextValue = event.currentTarget.value;

                    setFormValues(current =>
                      current
                        ? {
                            ...current,
                            title: nextValue,
                          }
                        : current,
                    );
                  }}
                  onBlur={() => markFieldTouched('title')}
                  error={hasTitleError ? 'Поле должно быть заполнено' : undefined}
                  rightSectionPointerEvents="all"
                  rightSection={
                    <FieldClearButton
                      hidden={formValues.title === ''}
                      onClick={() =>
                        setFormValues(current =>
                          current
                            ? {
                                ...current,
                                title: '',
                              }
                            : current,
                        )
                      }
                    />
                  }
                  withAsterisk
                />

                <Stack gap="xs">
                  <NumberInput
                    label="Цена"
                    placeholder="Введите цену"
                    value={formValues.price}
                    onChange={value =>
                      setFormValues(current =>
                        current
                          ? {
                              ...current,
                              price: value === '' ? '' : String(value),
                            }
                          : current,
                      )
                    }
                    onBlur={() => markFieldTouched('price')}
                    error={hasPriceError ? 'Поле должно быть заполнено' : undefined}
                    hideControls
                    min={0}
                    clampBehavior="none"
                    rightSectionPointerEvents="all"
                    rightSection={
                      <FieldClearButton
                        hidden={formValues.price === ''}
                        onClick={() =>
                          setFormValues(current =>
                            current
                              ? {
                                  ...current,
                                  price: '',
                                }
                              : current,
                          )
                        }
                      />
                    }
                    withAsterisk
                  />

                  <Popover
                    opened={isPricePopoverOpened}
                    onChange={setPricePopoverOpened}
                    width={360}
                    position="bottom-start"
                    shadow="md"
                    withinPortal
                  >
                    <Popover.Target>
                      <div>
                        <Button
                          variant="light"
                          color="orange"
                          leftSection={
                            priceSuggestionMutation.isPending ? (
                              <Loader size={16} color="orange" />
                            ) : showPriceRetryState ? (
                              <IconRefresh size={16} />
                            ) : (
                              <IconSparkles size={16} />
                            )
                          }
                          onClick={handlePriceSuggestion}
                          disabled={isAiDisabled}
                        >
                          {priceTriggerLabel}
                        </Button>
                      </div>
                    </Popover.Target>

                    <Popover.Dropdown>
                      <Stack gap="md">
                        <Text fw={600}>AI - Узнать рыночную цену</Text>

                        {priceSuggestionMutation.data ? (
                          <>
                            <Paper withBorder radius="md" p="md">
                              <Stack gap="xs">
                                <Text size="sm" fw={600}>
                                  Ответ AI
                                </Text>
                                <Text size="sm">
                                  Средняя цена: {priceSuggestionMutation.data.price.toLocaleString('ru-RU')} ₽
                                </Text>
                                {priceSuggestionMutation.data.reasoning ? (
                                  <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
                                    {priceSuggestionMutation.data.reasoning}
                                  </Text>
                                ) : null}
                              </Stack>
                            </Paper>

                            <Group justify="flex-end">
                              <Button
                                styles={applyButtonStyles}
                                onClick={() => {
                                  setFormValues(current =>
                                    current
                                      ? {
                                          ...current,
                                          price: String(priceSuggestionMutation.data.price),
                                        }
                                      : current,
                                  );
                                  closePricePopover();
                                }}
                              >
                                Применить
                              </Button>
                              <Button variant="default" onClick={closePricePopover}>
                                Закрыть
                              </Button>
                            </Group>
                          </>
                        ) : null}
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>

                  {isAiDisabled ? (
                    <Text size="xs" c="dimmed">
                      Для AI-запроса укажите хотя бы категорию и название объявления.
                    </Text>
                  ) : null}
                </Stack>

                <Card withBorder radius="lg" padding="lg">
                  <Stack gap="lg">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={600}>Характеристики</Text>
                      </div>
                    </Group>

                    {formValues.category === '' ? (
                      <Text c="dimmed">
                        Сначала выберите категорию, чтобы заполнить характеристики.
                      </Text>
                    ) : (
                      <Stack gap="lg">
                        {visibleParamFields.map(field => {
                          const fieldKey = `params.${field.name}`;
                          const fieldValue = formValues.params[field.name] ?? '';
                          const showOptionalWarning =
                            touchedFields[fieldKey] && isEmptyValue(fieldValue);

                          if (field.type === 'select') {
                            return (
                              <Select
                                key={field.name}
                                label={field.label}
                                placeholder={field.placeholder}
                                data={field.options ?? []}
                                value={fieldValue || null}
                                onChange={value =>
                                  setFormValues(current =>
                                    current
                                      ? {
                                          ...current,
                                          params: {
                                            ...current.params,
                                            [field.name]: value ?? '',
                                          },
                                        }
                                      : current,
                                  )
                                }
                                onBlur={() => markFieldTouched(fieldKey)}
                                clearable
                                searchable
                                description={
                                  showOptionalWarning ? 'Поле можно заполнить позже' : undefined
                                }
                                styles={showOptionalWarning ? optionalWarningStyles : undefined}
                              />
                            );
                          }

                          if (field.type === 'number') {
                            return (
                              <NumberInput
                                key={field.name}
                                label={field.label}
                                placeholder={field.placeholder}
                                value={fieldValue}
                                onChange={value =>
                                  setFormValues(current =>
                                    current
                                      ? {
                                          ...current,
                                          params: {
                                            ...current.params,
                                            [field.name]: value === '' ? '' : String(value),
                                          },
                                        }
                                      : current,
                                  )
                                }
                                onBlur={() => markFieldTouched(fieldKey)}
                                hideControls
                                clampBehavior="none"
                                min={field.min}
                                step={field.step}
                                rightSectionPointerEvents="all"
                                rightSection={
                                  <FieldClearButton
                                    hidden={fieldValue === ''}
                                    onClick={() =>
                                      setFormValues(current =>
                                        current
                                          ? {
                                              ...current,
                                              params: {
                                                ...current.params,
                                                [field.name]: '',
                                              },
                                            }
                                          : current,
                                      )
                                    }
                                  />
                                }
                                description={
                                  showOptionalWarning ? 'Поле можно заполнить позже' : undefined
                                }
                                styles={showOptionalWarning ? optionalWarningStyles : undefined}
                              />
                            );
                          }

                          return (
                            <TextInput
                              key={field.name}
                              label={field.label}
                              placeholder={field.placeholder}
                              value={fieldValue}
                              onChange={event => {
                                const nextValue = event.currentTarget.value;

                                setFormValues(current =>
                                  current
                                    ? {
                                        ...current,
                                        params: {
                                          ...current.params,
                                          [field.name]: nextValue,
                                        },
                                      }
                                    : current,
                                );
                              }}
                              onBlur={() => markFieldTouched(fieldKey)}
                              rightSectionPointerEvents="all"
                              rightSection={
                                <FieldClearButton
                                  hidden={fieldValue === ''}
                                  onClick={() =>
                                    setFormValues(current =>
                                      current
                                        ? {
                                            ...current,
                                            params: {
                                              ...current.params,
                                              [field.name]: '',
                                            },
                                          }
                                        : current,
                                    )
                                  }
                                />
                              }
                              description={
                                showOptionalWarning ? 'Поле можно заполнить позже' : undefined
                              }
                              styles={showOptionalWarning ? optionalWarningStyles : undefined}
                            />
                          );
                        })}
                      </Stack>
                    )}
                  </Stack>
                </Card>

                <Stack gap="xs">
                  <Textarea
                    label="Описание"
                    placeholder="Расскажите подробнее о товаре"
                    value={formValues.description}
                    onChange={event => {
                      const nextValue = event.currentTarget.value;

                      setFormValues(current =>
                        current
                          ? {
                              ...current,
                              description: nextValue,
                            }
                          : current,
                      );
                    }}
                    onBlur={() => markFieldTouched('description')}
                    autosize
                    minRows={6}
                    rightSectionPointerEvents="all"
                    rightSection={
                      <FieldClearButton
                        hidden={formValues.description === ''}
                        onClick={() =>
                          setFormValues(current =>
                            current
                              ? {
                                  ...current,
                                  description: '',
                                }
                              : current,
                          )
                        }
                      />
                    }
                    description={
                      <Group justify="space-between" gap="xs">
                        <Text
                          size="xs"
                          c={
                            touchedFields.description && isEmptyValue(formValues.description)
                              ? '#FFA940'
                              : 'transparent'
                          }
                        >
                          Поле можно заполнить позже
                        </Text>
                        <Text
                          size="xs"
                          c={
                            touchedFields.description && isEmptyValue(formValues.description)
                              ? '#FFA940'
                              : 'dimmed'
                          }
                        >
                          {formValues.description.length} символов
                        </Text>
                      </Group>
                    }
                    styles={
                      touchedFields.description && isEmptyValue(formValues.description)
                        ? optionalWarningStyles
                        : undefined
                    }
                  />

                  <Popover
                    opened={isDescriptionPopoverOpened}
                    onChange={setDescriptionPopoverOpened}
                    width={420}
                    position="bottom-start"
                    shadow="md"
                    withinPortal
                  >
                    <Popover.Target>
                      <div>
                        <Button
                          variant="light"
                          color="orange"
                          leftSection={
                        descriptionSuggestionMutation.isPending ? (
                          <Loader size={16} color="orange" />
                        ) : showDescriptionRetryState ? (
                              <IconRefresh size={16} />
                            ) : (
                              <IconSparkles size={16} />
                            )
                          }
                          onClick={handleDescriptionSuggestion}
                      disabled={isAiDisabled}
                        >
                          {descriptionTriggerLabel}
                        </Button>
                      </div>
                    </Popover.Target>

                    <Popover.Dropdown>
                      <Stack gap="md">
                        <Text fw={600}>AI - Описание</Text>

                        {descriptionSuggestionMutation.data ? (
                          <>
                            <Paper withBorder radius="md" p="md">
                              <Stack gap="xs">
                                <Text size="sm" fw={600}>
                                  Ответ AI
                                </Text>
                                <Text size="sm">{descriptionSuggestionMutation.data.description}</Text>
                              </Stack>
                            </Paper>

                            <Group justify="flex-end">
                              <Button
                                styles={applyButtonStyles}
                                onClick={() => {
                                  setFormValues(current =>
                                    current
                                      ? {
                                          ...current,
                                          description: descriptionSuggestionMutation.data.description,
                                        }
                                      : current,
                                  );
                                  closeDescriptionPopover();
                                }}
                              >
                                Применить
                              </Button>
                              <Button variant="default" onClick={closeDescriptionPopover}>
                                Закрыть
                              </Button>
                            </Group>
                          </>
                        ) : null}
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>
                </Stack>

                <Group justify="flex-end">
                  <Button variant="default" component={Link} to={`/ads/${itemId}`}>
                    Отменить
                  </Button>
                  <Button
                    className="save-button"
                    type="submit"
                    loading={updateMutation.isPending}
                    disabled={isSaveDisabled}
                  >
                    Сохранить
                  </Button>
                </Group>
              </Stack>
            </form>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 5 }}>
            <div ref={chatPanelRef}>
              <Card withBorder radius="lg" padding="lg" style={{ position: 'sticky', top: '1rem' }}>
                <Stack gap="lg">
                  <div>
                    <Group gap="xs" mb={4}>
                      <IconMessageCircle size={18} />
                      <Text fw={600}>Чат с Avitik AI</Text>
                    </Group>
                    <Text size="sm" c="dimmed">
                      Нужна помощь или уточнение? Спросите AI!
                    </Text>
                  </div>

                  <Paper
                    withBorder
                    radius="md"
                    p="md"
                    style={{ minHeight: 360, maxHeight: 480, overflowY: 'auto' }}
                  >
                    <Stack gap="sm">
                      {chatMessages.map(message => (
                        <Paper
                          key={message.id}
                          radius="md"
                          p="sm"
                          style={{
                            alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '92%',
                            backgroundColor:
                              message.role === 'user' ? '#1f2937' : '#f7f5f8',
                            color: message.role === 'user' ? '#f7f5f8' : '#1f2937',
                          }}
                        >
                          <Stack gap={4}>
                            <Text
                              size="xs"
                              fw={700}
                              c={message.role === 'user' ? '#d1d5db' : 'dimmed'}
                            >
                              {message.role === 'user' ? 'Вы' : 'Avitik AI'}
                            </Text>
                            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                              {message.content}
                            </Text>
                          </Stack>
                        </Paper>
                      ))}

                      {itemQuestionMutation.isPending ? (
                        <Paper
                          radius="md"
                          p="sm"
                          style={{
                            alignSelf: 'flex-start',
                            maxWidth: '92%',
                            backgroundColor: '#f7f5f8',
                            color: '#1f2937',
                          }}
                        >
                          <Text size="sm" c="dimmed">
                            Avitik думает над ответом...
                          </Text>
                        </Paper>
                      ) : null}
                    </Stack>
                  </Paper>

                  <Stack gap="xs">
                    <Textarea
                      label="Ваш вопрос"
                      placeholder="Например, что ещё стоит уточнить в этом объявлении?"
                      value={chatQuestion}
                      onChange={event => setChatQuestion(event.currentTarget.value)}
                      autosize
                      minRows={3}
                      disabled={itemQuestionMutation.isPending}
                      onKeyDown={event => {
                        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                          event.preventDefault();
                          handleChatSubmit();
                        }
                      }}
                    />
                    <Group justify="space-between" align="flex-start">
                      <Text size="xs" c="dimmed">
                        `Ctrl/Cmd + Enter` отправляет вопрос.
                      </Text>
                      <Group gap="sm">
                        <Button
                          variant="default"
                          onClick={handleChatClear}
                          disabled={itemQuestionMutation.isPending}
                        >
                          Очистить чат
                        </Button>
                        <Button
                          onClick={handleChatSubmit}
                          loading={itemQuestionMutation.isPending}
                          disabled={isChatSendDisabled}
                        >
                          Отправить
                        </Button>
                      </Group>
                    </Group>
                    {isAiDisabled ? (
                      <Text size="xs" c="dimmed">
                        Для диалога с AI заполните хотя бы категорию и название объявления.
                      </Text>
                    ) : null}
                  </Stack>
                </Stack>
              </Card>
            </div>
          </Grid.Col>
        </Grid>
      </Paper>
    </Stack>
  );
}
