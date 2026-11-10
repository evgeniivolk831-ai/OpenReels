# Бесплатная генерация видео с телефона — без установки

## Короткий ответ

Для телефона без денег и без собственного GPU наиболее реалистичный путь — использовать публичный Hugging Face Space с LTX-2.5. Модель работает на общей ZeroGPU-инфраструктуре, поэтому не требует установки приложения, компьютера или оплаты за каждый ролик.

**Открыть официальный генератор:** https://huggingface.co/spaces/Lightricks/LTX-2.5

Резервный генератор предыдущей версии: https://huggingface.co/spaces/Lightricks/ltx-video-distilled

## Как получить MP4 на телефоне

1. Открой официальный Space по ссылке выше в браузере телефона.
2. Войди в бесплатный Hugging Face аккаунт, если попросит. Для ZeroGPU бесплатный аккаунт имеет более высокую дневную квоту, чем анонимный доступ.
3. Выбери Text-to-Video.
4. Вставь описание сцены на русском или английском. Для мультфильма укажи стиль, героя, действие, окружение, движение камеры и формат.
5. Запусти генерацию и дождись своей очереди.
6. Когда появится видео, открой результат и сохрани MP4 в телефон.

## Пример промта для мультфильма

```text
A charming 2D cartoon animation, a curious little fox wearing a blue scarf walks through a magical forest at sunrise. The fox discovers a glowing golden seed under a giant mushroom, looks surprised and smiles. Colorful hand-painted backgrounds, expressive character animation, clean outlines, warm cinematic lighting, smooth camera push-in, consistent character design, family-friendly educational cartoon, vertical 9:16 composition, no text, no watermark.
```

## Ограничения бесплатного режима

- Hugging Face ZeroGPU — общая очередь, поэтому иногда приходится ждать или повторять запрос.
- Официальная документация указывает дневную квоту: 2 минуты GPU для анонимного доступа и 5 минут для бесплатного аккаунта. Квота расходуется именно GPU-временем, а не только длиной итогового ролика.
- Бесплатный сервис может быть временно перегружен или недоступен. Это не гарантированный хостинг и не персональный GPU.
- Не загружай личные/конфиденциальные изображения и материалы, на которые нет прав.
- Генератор создаёт видеоклип; полноценный длинный мультфильм со стабильным персонажем, русской дикторской дорожкой и монтажом потребует нескольких клипов и отдельного монтажа.

## Почему это не встроено как безлимитная кнопка OpenReels

GitHub Pages может бесплатно размещать статическую страницу, но не выполняет тяжёлую генерацию видео. Бесплатный Hugging Face Space выполняет её на своей общей GPU. Проксировать длительный SSE-запрос через бесплатный хостинг без собственного проверенного backend ненадёжно; серверлес-платформы ограничивают время запроса.

В репозитории есть адаптер ComfyUI/LTX для собственного ComfyUI-сервера, но он не превращает телефон в GPU и не предоставляет бесплатный удалённый сервер. Для автоматической отправки промта из OpenReels и возврата MP4 необходим доступный backend, а не только GitHub.

## Полезные ссылки

- Официальная LTX-2.5 модель/Space: https://huggingface.co/spaces/Lightricks/LTX-2.5
- Старый LTX Video Space: https://huggingface.co/spaces/Lightricks/ltx-video-distilled
- Документация бесплатной ZeroGPU-квоты: https://huggingface.co/docs/hub/spaces-zerogpu
- Исходный проект prompt-to-video: https://github.com/umer-un/prompt-to-video
- Бесплатная мобильная обёртка для image-to-video (нужно загрузить картинку): https://igorcsis.github.io/nifty-vid/


## Как получить больше бесплатного GPU-времени

Если дневной квоты ZeroGPU недостаточно, можно вручную использовать Kaggle Notebooks с GPU: в документации Kaggle указано до 30 GPU-часов в неделю (квота может зависеть от доступности). Это существенно больше короткой ZeroGPU-квоты, но не безлимитно и не гарантирует постоянную работу сервера. С телефона можно открыть notebook в браузере, но запуск и обслуживание такого окружения менее удобны, чем готовый Space.

- Kaggle GPU usage: https://www.kaggle.com/docs/efficient-gpu-usage
- Google Colab FAQ: https://research.google.com/colaboratory/faq.html

Подробная техническая схема и честные ограничения: [NO-LIMIT-GENERATION.md](NO-LIMIT-GENERATION.md).
