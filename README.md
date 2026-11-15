# Chess Review

Веб-приложение для просмотра и разбора последних партий игрока на Chess.com: поиск по никнейму, список партий из актуального архива и интерактивная шахматная доска с навигацией по ходам.

## Возможности

- Поиск игрока по никнейму через публичный API Chess.com.
- Профиль игрока: аватар, титул, рейтинги в пуле, блице, рапиде и по дням.
- Последние 10 партий из актуального архива: соперники, рейтинги, результат, контроль времени, точность, дебют и ссылка на Chess.com.
- Экран разбора: доска, SAN-нотация, список ходов, кнопки «в начало / назад / вперёд / в конец», ползунок и переворот доски.
- Навигация с клавиатуры: `←` / `→`, `Home` / `End`.
- Режим анализа: можно сыграть альтернативный ход прямо на доске; основная линия партии при этом не теряется.
- Адаптивная тёмная тема в духе Chess.com (`#262421`).

## Стек

React 19, TypeScript, Vite, [chess.js](https://github.com/jhlywa/chess.js), lucide-react. Стили — обычный CSS без UI-фреймворков.

## Запуск

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run preview
npm run lint
```

## API Chess.com

Используется публичный [Published Data API](https://www.chess.com/news/view/published-data-api):

- `GET https://api.chess.com/pub/player/{username}/games/archives` — список архивов;
- `GET https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}` — партии за месяц;
- `GET https://api.chess.com/pub/player/{username}` — профиль;
- `GET https://api.chess.com/pub/player/{username}/stats` — рейтинги.

Важно: в формулировке задачи endpoint указан как `/archives`, однако у Chess.com он называется `/games/archives`; в приложении используется рабочий маршрут. Берётся последний архив; если в нём пока нет завершённых партий, приложение проверяет предыдущие месяцы. API отдаёт `Access-Control-Allow-Origin: *`, поэтому запросы идут напрямую из браузера.

## Структура

```
src/
  lib/chesscom.ts      — запросы к Chess.com, валидация ника, выбор архива
  lib/pgn.ts           — разбор PGN через chess.js, позиции и статусы
  lib/format.ts        — форматирование дат, контроля времени, результатов
  lib/pieces.ts        — символы фигур и их названия
  hooks/usePlayerSearch.ts
  components/          — доска, список ходов, карточки, профиль
  pages/               — главная страница и экран партии
  App.tsx              — поиск, переходы между экранами, шапка и подвал
```

## Примечание

Приложение использует только публичные данные и не аффилировано с Chess.com.
