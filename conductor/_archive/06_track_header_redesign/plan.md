# План реализации: Редизайн UI

## Фаза 1: Нижняя панель ввода (Bottom Input Bar)

- [x] Task: Создать компонент `BottomInputBar`
    - [x] Перенести логику ввода текста (`newNote`, `handleManualNoteSubmit`) из Header в новый компонент.
    - [x] Перенести кнопки микрофона (`onVoiceSubmit`) и холста (`onOpenCanvas`) в этот компонент.
    - [x] Сверстать панель в стиле мессенджера (прилипает к низу экрана).
- [x] Task: Интегрировать `BottomInputBar` в `Board.tsx`
    - [x] Удалить соответствующие пропсы из `Header`.
    - [x] Разместить панель внизу рабочей области.
- [x] Task: Conductor - User Manual Verification 'Фаза 1: Панель ввода' (Protocol in workflow.md)

## Фаза 2: Редизайн Header (Share и Management меню)

- [x] Task: Создать компонент/меню "Поделиться"
    - [x] Объединить вызов QR-кода, копирование ссылки и новые кнопки Web Share (или прямые ссылки TG/WA).
- [x] Task: Создать меню "Управление"
    - [x] Добавить в Header dropdown-меню.
    - [x] Перенести туда функционал "Недавние комнаты" (History) и кнопку "Создать новую комнату".
- [x] Task: Очистить `Header.tsx`
    - [x] Удалить старые разрозненные кнопки.
    - [x] Обновить верстку (только иконки на мобильных).
- [x] Task: Conductor - User Manual Verification 'Фаза 2: Header меню' (Protocol in workflow.md)

## Фаза 3: Индикаторы статуса и финальная полировка

- [x] Task: Добавить индикаторы в `Header`
    - [x] Иконка `🔒` если `roomSettings.is_protected`.
    - [x] Иконка часов для `roomSettings.ttl`.
- [x] Task: Адаптация верстки `Board.tsx`
    - [x] Убедиться, что `CardGrid` не перекрывается новой нижней панелью (добавить `padding-bottom`).
    - [x] Протестировать работу на мобильном разрешении.
- [x] Task: Conductor - User Manual Verification 'Фаза 3: Полировка' (Protocol in workflow.md)