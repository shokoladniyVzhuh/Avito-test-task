# Avito Test Task

Тестовое задание на позицию Frontend Intern.

Проект представляет собой небольшой marketplace-интерфейс для работы с объявлениями.  
Приложение состоит из двух частей:

- `client` — frontend на React + TypeScript
- `server` — backend на Fastify + TypeScript

Дополнительно в проект интегрирован локальный LLM через Ollama для AI-функций.

## Функциональность

Приложение поддерживает:

- просмотр списка объявлений;
- переход на страницу конкретного объявления;
- редактирование объявления;
- поиск, фильтрацию и сортировку списка;
- отображение незаполненных полей и объявлений, требующих доработки;
- AI-функции через локальную LLM.

## Стек

### Frontend
- React
- TypeScript
- Vite
- Mantine
- TanStack React Query
- React Router
- Axios

### Backend
- Fastify
- TypeScript
- Zod

### LLM
- Ollama
- модель по умолчанию: `qwen2.5:1.5b`

## Структура проекта

```text
.
├── client/
└── server/
```

## Требования

Для запуска нужны:

* Node.js 20+;
* npm;
* Ollama.

## Установка и запуск

### 1. Клонировать репозиторий

```bash
git clone <repo-url>
cd Avito-test-task
```

### 2. Запустить backend

```bash
cd server
npm install
npm run start
```

Сервер по умолчанию запускается на:

```text
http://localhost:8080
```

### 3. Настроить и запустить LLM

Нужно установить Ollama и скачать модель:

```bash
ollama pull qwen2.5:1.5b
```

После этого запустить Ollama в отдельном терминале:

```bash
ollama serve
```

По умолчанию LLM API ожидается по адресу:

```text
http://localhost:11434
```

### 4. Запустить frontend

Открыть третий терминал:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Обычно frontend будет доступен по адресу:

```text
http://localhost:5173
```

## Переменные окружения

Файл `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_LLM_URL=http://localhost:11434
VITE_LLM_MODEL=qwen2.5:1.5b
```

Если `.env` не задан, во frontend уже предусмотрены fallback-значения:

* `VITE_API_BASE_URL=http://localhost:8080`
* `VITE_LLM_URL=http://localhost:11434`
* `VITE_LLM_MODEL=qwen2.5:1.5b`

## Быстрый запуск

Терминал 1:

```bash
cd server
npm install
npm run start
```

Терминал 2:

```bash
ollama pull qwen2.5:1.5b
ollama serve
```

Терминал 3:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## Принятые самостоятельные решения

### 1. Кнопка "Пагинация" возле строки поиска.

В тексте задания не был упомянут подобный функционал, однако он присутствовал на макете figma.

### 2. Кнопка "На главную" на странице товара.

Со страницы товара нельзя было вернуться обратно к списку товаров, для этого была добавлена такая кнопка, улучшающая UX.

### 3. Чат с ИИ.

Был разработан внешний вид чата, так как он не был показан на макете. Также было выбрано название "Avitik AI".

### 4. Сохранение фильтров.

При возвращении на главную страницу с карточки товара фильтры сохраняются. 

### 5. Страница 404.

Добавлена страница, показывающая пользователю, что URL неверен, и перенаправляющая на главную.

### 6. Модель LLM.

Это не совсем мой выбор, но мой ноутбук не тянул llama3, в следствии чего мне пришлось выбрать qwen2.5:1.5b.

## Если AI-функции не работают

Нужно проверить:

1. запущен ли `ollama serve`;
2. скачана ли модель `qwen2.5:1.5b`;
3. правильно ли заполнен `client/.env`;
4. запущен ли backend на `http://localhost:8080`.
