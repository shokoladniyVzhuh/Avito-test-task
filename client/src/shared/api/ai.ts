import axios from 'axios';
import { env } from '../config/env.ts';
import type { ItemCategory } from '../types/item.ts';

type GenerateResponse = {
  response: string;
};

export type AiItemInput = {
  category: ItemCategory;
  title: string;
  description: string;
  price: number | null;
  params: Record<string, string | number>;
};

export type DescriptionSuggestion = {
  description: string;
};

export type PriceSuggestion = {
  price: number;
  reasoning: string;
};

export type AiChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ItemQuestionAnswer = {
  answer: string;
};

const aiHttpClient = axios.create({
  baseURL: env.llmUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

const categoryLabels: Record<ItemCategory, string> = {
  auto: 'Авто',
  real_estate: 'Недвижимость',
  electronics: 'Электроника',
};

const paramLabelsByCategory: Record<ItemCategory, Record<string, string>> = {
  auto: {
    brand: 'Марка',
    model: 'Модель',
    yearOfManufacture: 'Год выпуска',
    transmission: 'Коробка передач',
    mileage: 'Пробег, км',
    enginePower: 'Мощность двигателя, л.с.',
  },
  real_estate: {
    type: 'Тип недвижимости',
    address: 'Адрес',
    area: 'Площадь, м²',
    floor: 'Этаж',
  },
  electronics: {
    type: 'Тип товара',
    brand: 'Бренд',
    model: 'Модель',
    condition: 'Состояние',
    color: 'Цвет',
  },
};

const valueLabels: Record<string, string> = {
  automatic: 'автоматическая',
  manual: 'механическая',
  flat: 'квартира',
  house: 'дом',
  room: 'комната',
  phone: 'телефон',
  laptop: 'ноутбук',
  misc: 'другое',
  new: 'новый',
  used: 'б/у',
};

const sharedSystemPrompt = [
  'Ты помощник для редактирования объявлений на маркетплейсе.',
  'Отвечай только валидным JSON без markdown и пояснений вне JSON.',
  'Не выдумывай характеристики, которых нет во входных данных.',
  'Пиши кратко, по делу и на русском языке.',
].join(' ');

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeMultilineWhitespace(value: string) {
  return value
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function stringifyValue(value: string | number) {
  if (typeof value === 'number') {
    return String(value);
  }

  return valueLabels[value] ?? value;
}

function buildItemContext(input: AiItemInput) {
  const paramLines = Object.entries(input.params)
    .map(([key, value]) => {
      const label = paramLabelsByCategory[input.category][key] ?? key;
      return `- ${label}: ${stringifyValue(value)}`;
    })
    .join('\n');

  return [
    `Категория: ${categoryLabels[input.category]}`,
    `Название: ${input.title}`,
    `Текущая цена: ${input.price === null ? 'не указана' : `${Math.round(input.price)} RUB`}`,
    `Текущее описание: ${input.description || 'отсутствует'}`,
    paramLines ? `Характеристики:\n${paramLines}` : 'Характеристики: не указаны',
  ].join('\n');
}

function buildChatHistoryContext(history: AiChatMessage[]) {
  if (history.length === 0) {
    return 'История диалога: отсутствует';
  }

  const historyLines = history.map(message => {
    const roleLabel = message.role === 'user' ? 'Пользователь' : 'AI';
    return `${roleLabel}: ${normalizeWhitespace(message.content)}`;
  });

  return `История диалога:\n${historyLines.join('\n')}`;
}

function extractJsonPayload(rawResponse: string) {
  const trimmed = rawResponse.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBraceIndex = trimmed.indexOf('{');
  const lastBraceIndex = trimmed.lastIndexOf('}');

  if (firstBraceIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
    return trimmed.slice(firstBraceIndex, lastBraceIndex + 1);
  }

  return trimmed;
}

async function generateStructuredResponse<T>(prompt: string, signal?: AbortSignal) {
  const response = await aiHttpClient.post<GenerateResponse>('/api/generate', {
    model: env.llmModel,
    system: sharedSystemPrompt,
    prompt,
    format: 'json',
    stream: false,
    options: {
      temperature: 0.2,
    },
  }, {
    signal,
  });

  return JSON.parse(extractJsonPayload(response.data.response)) as T;
}

function parseDescriptionSuggestion(payload: unknown): DescriptionSuggestion {
  if (!payload || typeof payload !== 'object' || !('description' in payload)) {
    throw new Error('AI response does not contain description');
  }

  const description = normalizeWhitespace(String(payload.description));

  if (!description) {
    throw new Error('AI response contains an empty description');
  }

  return { description };
}

function parsePriceSuggestion(payload: unknown): PriceSuggestion {
  if (!payload || typeof payload !== 'object' || !('price' in payload)) {
    throw new Error('AI response does not contain price');
  }

  const rawReasoning = 'reasoning' in payload ? String(payload.reasoning ?? '') : '';
  const parsedPrice = Math.round(Number(payload.price));

  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    throw new Error('AI response contains an invalid price');
  }

  return {
    price: parsedPrice,
    reasoning: normalizeMultilineWhitespace(rawReasoning),
  };
}

function parseQuestionAnswer(payload: unknown): ItemQuestionAnswer {
  if (!payload || typeof payload !== 'object' || !('answer' in payload)) {
    throw new Error('AI response does not contain answer');
  }

  const answer = normalizeWhitespace(String(payload.answer));

  if (!answer) {
    throw new Error('AI response contains an empty answer');
  }

  return { answer };
}

export async function generateDescriptionSuggestion(
  input: AiItemInput,
  signal?: AbortSignal,
) {
  const prompt = [
    'Сгенерируй описание объявления для маркетплейса.',
    'Если описание уже есть, улучши его стиль и читаемость, но не меняй факты.',
    'Если описания нет, создай новое только по известным данным.',
    'Требования к описанию:',
    '- 2-4 предложения.',
    '- Нейтральный и убедительный тон без рекламной воды.',
    '- Без emoji, восклицаний, CAPS LOCK и выдуманных преимуществ.',
    '- Не упоминай то, чего нет во входных данных.',
    '- Сделай текст пригодным для текстового поля карточки объявления.',
    'Верни строго JSON вида {"description":"..."}',
    '',
    buildItemContext(input),
  ].join('\n');

  const payload = await generateStructuredResponse(prompt, signal);
  return parseDescriptionSuggestion(payload);
}

export async function generatePriceSuggestion(input: AiItemInput, signal?: AbortSignal) {
  const prompt = [
    'Оцени вероятную рыночную цену объявления в российских рублях.',
    'Учитывай категорию, характеристики, состояние и уже указанную цену, если она есть.',
    'Не делай вид, что у тебя есть доступ к живому рынку. Если данных мало, дай осторожную приблизительную оценку.',
    'Верни цену как целое число в RUB.',
    'Поле reasoning оформи в полезном для пользователя виде:',
    '- первая строка: "Средняя цена на <краткое название>: <число> ₽"',
    '- дальше 2-4 коротких строки с маркерами "• "',
    '- в строках с маркерами укажи ориентиры по диапазонам или факторам состояния',
    '- без markdown-заголовков и без лишней воды',
    'Верни строго JSON вида {"price":123456,"reasoning":"Средняя цена на ...\\n• ...\\n• ..."}',
    '',
    buildItemContext(input),
  ].join('\n');

  const payload = await generateStructuredResponse(prompt, signal);
  return parsePriceSuggestion(payload);
}

export async function askItemQuestion(
  input: AiItemInput,
  question: string,
  history: AiChatMessage[],
  signal?: AbortSignal,
) {
  const prompt = [
    'Ответь на уточняющий вопрос пользователя о конкретном объявлении.',
    'Используй только контекст карточки и историю диалога.',
    'Если данных для точного ответа недостаточно, честно сообщи об этом и предложи, что стоит уточнить в объявлении.',
    'Верни JSON вида {"answer":"..."}',
    '',
    buildItemContext(input),
    '',
    buildChatHistoryContext(history),
    '',
    `Новый вопрос пользователя: ${normalizeWhitespace(question)}`,
  ].join('\n');

  const payload = await generateStructuredResponse(prompt, signal);
  return parseQuestionAnswer(payload);
}
