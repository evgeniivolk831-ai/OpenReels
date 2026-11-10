# Wan 2.1 VACE 1.3B через ComfyUI и OpenReels

Этот workflow — более реалистичный кандидат для бесплатной GPU-сессии, чем LTX-2.5: Wan 2.1 VACE 1.3B умеет Reference-to-Video (анимировать сцену по исходной картинке и тексту), а ComfyUI предоставляет готовый workflow. В отличие от обычной Wan T2V 1.3B, VACE принимает reference image — это важно для конвейера OpenReels.

## Что известно о совместимости

- Официальная документация ComfyUI описывает VACE 1.3B как облегчённую модель примерно на 7 ГБ; вариант 14B существенно тяжелее.
- VACE 1.3B поддерживает 480p, а не 720p.
- Kaggle может выдавать P100 или T4 с 16 ГБ VRAM, но доступность и время сессии не гарантированы.
- Размер файла модели не равен пиковому расходу VRAM. Текстовый encoder, VAE, разрешение и число кадров добавляют расход памяти. Поэтому запуск на T4/P100 — кандидат на тест, а не подтверждённая гарантия.
- Для старта используй FP16 веса, низкое разрешение и CPU offload для текстового encoder, если выбранный workflow это позволяет. Не начинай с 14B.

## 1. Взять официальный workflow

Открой workflow **Wan2.1 VACE Reference to Video** в ComfyUI Hub:

https://comfy.org/hub/workflows/wan2-1-vace-reference-to-video-83ff3768d42b/

Сначала запусти его внутри ComfyUI вручную с одной картинкой. Выбери модель **Wan2.1 VACE 1.3B**, не 14B. Убедись, что workflow действительно выдаёт видео и что выбранный output node сохраняет MP4.

Официальная инструкция ComfyUI по VACE и списку файлов моделей:

https://docs.comfy.org/tutorials/video/wan/vace

Модели хранятся в каталоге ComfyUI, не в репозитории OpenReels. Не добавляй веса в Git.

## 2. Подготовить API-workflow для OpenReels

В ComfyUI экспортируй проверенный граф в формате **API**. В экспортированном JSON замени значения узлов:

| Маркер OpenReels | Поле workflow |
|---|---|
| `__OPENREELS_PROMPT__` | positive prompt / текстовый encoder |
| `__OPENREELS_IMAGE__` | имя файла в узле LoadImage |
| `__OPENREELS_NEGATIVE_PROMPT__` | negative prompt, если он есть |
| `__OPENREELS_FRAMES__` | длина видео в WanVaceToVideo |
| `__OPENREELS_WIDTH__` | ширина WanVaceToVideo |
| `__OPENREELS_HEIGHT__` | высота WanVaceToVideo |

Оставь узел сохранения видео (SaveVideo/Video Combine) в конце графа. Адаптер OpenReels ищет видеофайл в выходах ComfyUI с расширением MP4, WebM или MOV.

Не копируй JSON workflow из обычного UI-экспорта: нужен именно **API format**. Имена входов в разных версиях графа могут отличаться — проверь их в своём экспортированном JSON.

## 3. Настроить OpenReels

В окружении API/worker задай:

```dotenv
COMFYUI_URL=http://127.0.0.1:8188
COMFYUI_WORKFLOW_PATH=./workflows/wan-vace-api.json
COMFYUI_TIMEOUT_MS=900000

# Wan VACE 1.3B, начальный тест 480p landscape:
COMFYUI_WIDTH=832
COMFYUI_HEIGHT=480
COMFYUI_FPS=16
COMFYUI_FRAME_STEP=4
```

Для Wan используется правило количества кадров вида `4n + 1`: при 5 секундах и 16 FPS адаптер подставит 81 кадр. Для LTX обычно оставляют 24 FPS и `COMFYUI_FRAME_STEP=8` (121 кадр на 5 секунд).

Адаптер ComfyUI общий: отдельный провайдер Wan в коде не нужен. Выбери в OpenReels **ComfyUI (self-hosted workflow)**. Для вертикального видео адаптер меняет местами ширину и высоту; сначала проверь landscape 832×480, затем тестируй portrait.

## 4. Тест на бесплатной GPU-сессии

В Kaggle Notebook выбери GPU, если он доступен, и проверь в начале сессии:

```python
import torch
print(torch.cuda.get_device_name(0))
print(round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 1), "GB VRAM")
print("fp16:", torch.cuda.is_available())
```

Затем установи ComfyUI, модели и workflow по официальной инструкции ComfyUI. Включи low-VRAM/CPU-offload настройки, если они поддерживаются выбранными loader-узлами. Сначала запусти один клип в ComfyUI напрямую, только потом подключай OpenReels.

Kaggle-сессия временная: после остановки сессии GPU-сервер исчезнет. Для связи с OpenReels нужен доступный из worker адрес ComfyUI. Не публикуй ComfyUI без авторизации; временный публичный туннель без защиты может открыть посторонним доступ к GPU и файлам.

## Честный статус интеграции

- В OpenReels уже есть универсальный ComfyUI API-workflow adapter: он отправляет изображение и промпт, ждёт завершения и скачивает видео для дальнейшего монтажа.
- В этой ветке добавлены настраиваемые размеры, FPS и шаг кадров, чтобы один адаптер мог работать и с LTX, и с Wan.
- **Kaggle worker не развёрнут и не подключён к постоянной очереди.** Для этого нужен запущенный Kaggle runtime и защищённый сетевой маршрут к нему. Сам GitHub не запускает GPU.
- Совместимость VACE 1.3B с конкретной бесплатной Kaggle GPU-сессией ещё нужно подтвердить реальным smoke-test. У модели есть шанс уложиться в 16 ГБ с offload, но это не обещание успешного запуска.
- OpenReels по-прежнему требует отдельно настроенные LLM и генератор изображений; TTS/музыка/монтаж — отдельные этапы. Один VACE не создаёт весь мультфильм из одной фразы без остальных провайдеров.

## Источники

- Wan 2.1 VACE 1.3B: https://huggingface.co/Wan-AI/Wan2.1-VACE-1.3B
- Официальный VACE guide: https://docs.comfy.org/tutorials/video/wan/vace
- ComfyUI Reference-to-Video workflow: https://comfy.org/hub/workflows/wan2-1-vace-reference-to-video-83ff3768d42b/
- Wan 2.1 repository: https://github.com/Wan-Video/Wan2.1
