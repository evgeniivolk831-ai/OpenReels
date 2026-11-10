# ComfyUI + LTX-2.5: подключение к OpenReels

OpenReels поддерживает ComfyUI как дополнительный видеопровайдер. Интеграция отправляет API-workflow в ComfyUI, загружает исходный кадр сцены, ждёт завершения, скачивает MP4 и передаёт его в существующий монтаж.

## 1. Установить ComfyUI и LTX-2.5

Официальные источники:
- ComfyUI: https://github.com/Comfy-Org/ComfyUI
- Дополнительные LTX-ноды/workflows: https://github.com/Lightricks/ComfyUI-LTXVideo
- Официальная инструкция LTX + ComfyUI: https://docs.ltx.io/open-source-model/integration-tools/comfy-ui

В актуальном ComfyUI LTX-2 уже встроен в core; репозиторий Lightricks содержит дополнительные ноды и workflow. Для типовой локальной установки:

```bash
git clone https://github.com/Comfy-Org/ComfyUI.git
cd ComfyUI
# Установить зависимости и запустить ComfyUI согласно официальной инструкции для своей ОС/CUDA.
```

При необходимости дополнительные узлы:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Lightricks/ComfyUI-LTXVideo.git
cd ComfyUI-LTXVideo
uv sync --frozen
```

Открой ComfyUI, найди шаблон LTX-2.5 Text-to-Video или Image-to-Video и скачай все требуемые модели через Workflow Overview / Manager. Официальные требования для локального LTX-2.5: CUDA GPU с 32 ГБ+ VRAM и ориентировочно 100 ГБ свободного места. Проверь актуальные требования и совместимость весов перед загрузкой.

**Не клонируй веса моделей в репозиторий OpenReels.** Они большие и могут иметь отдельные условия лицензирования/доступа.

## 2. Подготовить API-workflow

В интерфейсе ComfyUI открой подходящий LTX-2.5 workflow и экспортируй его в формате **API** (Save/API format), не обычный workflow JSON. Сохрани файл, например, как `workflows/ltx-2.5-api.json`.

В API JSON замени значения соответствующих входов узлов на строки-маркеры:

| Маркер | Что подставит OpenReels |
|---|---|
| `__OPENREELS_PROMPT__` | Prompt движения сцены |
| `__OPENREELS_IMAGE__` | Имя загруженного reference image |
| `__OPENREELS_NEGATIVE_PROMPT__` | Negative prompt |
| `__OPENREELS_FRAMES__` | Число кадров, округлённое под `COMFYUI_FRAME_STEP` (по умолчанию 8n+1) |
| `__OPENREELS_WIDTH__` | Ширина из `COMFYUI_WIDTH`/`COMFYUI_HEIGHT` с учётом ориентации |
| `__OPENREELS_HEIGHT__` | Высота из `COMFYUI_WIDTH`/`COMFYUI_HEIGHT` с учётом ориентации |

Маркеры нужно поставить в соответствующие входы именно твоего workflow: текстовый encoder, image loader, negative conditioning и параметры длины/размера. Не каждый workflow использует все маркеры; проверь соответствие полей и типов узлов. Для видеоэкспорта добавь Video Combine/Save Video узел, который выдаёт MP4. Адаптер ищет MP4/WebM/MOV в выходах `videos`, `gifs` или `files`.

## 3. Настроить OpenReels

Добавь в корневой `.env`:

```dotenv
COMFYUI_URL=http://127.0.0.1:8188
COMFYUI_WORKFLOW_PATH=./workflows/ltx-2.5-api.json
COMFYUI_TIMEOUT_MS=600000
```

Если OpenReels запущен в Docker, `127.0.0.1` указывает на контейнер OpenReels, а не на хост. Используй адрес ComfyUI, доступный из контейнера (например, имя сервиса в общей Docker-сети или адрес хоста).

Перезапусти API и worker. В веб-студии открой «Дополнительно» → «Video Provider» → «ComfyUI (self-hosted workflow)». При выборе ComfyUI он становится первым видеопровайдером; настроенные Veo/fal остаются резервными. В режиме «Automatic fallback» сохраняется автоматический порядок.

## 4. Проверка

1. Убедись, что ComfyUI доступен с сервера OpenReels.
2. Сначала запусти workflow прямо в ComfyUI и проверь, что он выдаёт MP4.
3. Создай короткий тестовый ролик в OpenReels.
4. Проверь логи worker, stage Visuals и финальный MP4.

Если ComfyUI не настроен, выбранный явно провайдер завершит задачу с понятной ошибкой. Не выбирай его до запуска сервера и проверки workflow.

## Безопасность и стоимость

- Не выставляй ComfyUI API в публичный интернет без сетевой изоляции и аутентификации на reverse proxy.
- Ограничь доступ к API только сервером OpenReels.
- Храни ключи провайдеров и адреса приватных серверов в секретах окружения, не в Git.
- LTX локально не требует оплаты за каждый запрос к API, но GPU, электричество, дисковое пространство и обслуживание имеют стоимость.
- Русская озвучка в OpenReels остаётся отдельным TTS этапом; встроенное аудио LTX не заменяет проверенную русскую дикторскую дорожку.

## Ограничения адаптера

Адаптер заменяет только явные маркеры в API-workflow. Он не угадывает структуру произвольного ComfyUI графа и не может автоматически скачивать веса или устанавливать ComfyUI на удалённый GPU-сервер. Для каждого выбранного workflow требуется один раз настроить маркеры и проверить выходной video node.
