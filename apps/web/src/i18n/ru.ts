import type { TranslationDict } from "./en";

export const ru: TranslationDict = {
  appName: "Мафия",
  skipToContent: "Перейти к содержимому",

  home: {
    title: "Мафия",
    subtitle: "Ваш телефон - ведущий. Общайтесь вслух, играйте вживую.",
    nameLabel: "Ваше имя",
    namePlaceholder: "например, Алекс",
    nameRequired: "Пожалуйста, введите имя.",
    languageLabel: "Язык игры",
    createHeading: "Создать новую игру",
    createButton: "Создать комнату",
    joinHeading: "Присоединиться к игре",
    roomCodeLabel: "Код комнаты",
    roomCodePlaceholder: "например, ABCD",
    roomCodeRequired: "Пожалуйста, введите код комнаты.",
    joinButton: "Войти в комнату",
    connecting: "Подключение к серверу...",
  },

  lobby: {
    title: "Лобби",
    roomCode: "Код комнаты",
    copyCode: "Скопировать код комнаты",
    codeCopied: "Код комнаты скопирован!",
    players: "Игроки ({count})",
    settingsHeading: "Настройки игры",
    mafiaCount: "Количество мафии",
    decreaseMafia: "Уменьшить количество мафии",
    increaseMafia: "Увеличить количество мафии",
    hasDoctor: "Включить доктора",
    hasSheriff: "Включить шерифа",
    minPlayersWarning: "Для этих настроек нужно минимум {count} игроков (сейчас {have}).",
    readyExplainer: "Настройки может менять любой игрок. Игра начнётся, как только большинство игроков отметят готовность.",
    readyCount: "Готовы {count} из {required} необходимых.",
    markReady: "Я готов",
    cancelReady: "Ещё не готов",
  },

  role: {
    heading: "Ваша роль",
    mafia: "Мафия",
    doctor: "Доктор",
    sheriff: "Шериф",
    civilian: "Мирный житель",
    mafiaDesc: "Каждую ночь тайно выбирайте жертву вместе с другими мафиози. Днём не выдавайте себя.",
    doctorDesc: "Каждую ночь выбирайте одного игрока, чтобы защитить его от мафии.",
    sheriffDesc: "Каждую ночь проверяйте одного игрока, чтобы узнать, мафия ли он.",
    civilianDesc: "У вас нет особых способностей. Используйте обсуждение и голосование, чтобы найти мафию.",
    dismiss: "Понятно",
  },

  phase: {
    lobby: "Лобби",
    night: "Ночь",
    night_resolve: "Подводим итоги ночи...",
    day_reveal: "Утренние новости",
    day_discussion: "Обсуждение",
    day_vote: "Голосование",
    vote_resolve: "Подсчёт голосов...",
    game_over: "Игра окончена",
  },

  night: {
    yourTurn: "Сейчас ваш ход.",
    mafiaPrompt: "Выберите игрока для устранения:",
    doctorPrompt: "Выберите игрока для защиты:",
    sheriffPrompt: "Выберите игрока для проверки:",
    civilianWaiting: "Наступила ночь. Ожидайте, пока другие действуют.",
    waitingForOthers: "Ожидание, пока другие игроки завершат свои ночные действия...",
    actionSubmitted: "Действие отправлено. Ожидание завершения ночи.",
    sheriffResultHeading: "Результат проверки",
    sheriffResultMafia: "{name} - мафия!",
    sheriffResultInnocent: "{name} не мафия.",
    readyToSkip: "Готов продолжить, не дожидаясь остальных",
    continueReady: "Готов продолжить",
  },

  vote: {
    heading: "Проголосуйте",
    prompt: "Голосуйте за игрока, которого считаете мафией:",
    abstain: "Воздержаться",
    voteSubmitted: "Голос отправлен. Ожидание остальных.",
    readyToVote: "Готов начать голосование",
    tally: "Голосов: {count}",
  },

  gameOver: {
    heading: "Игра окончена",
    townWins: "Мирные жители победили!",
    mafiaWins: "Мафия победила!",
    readyToPlayAgain: "Готов сыграть ещё раз",
    backToHome: "Покинуть комнату",
  },

  narrator: {
    heading: "Журнал ведущего",
    empty: "Здесь будет разворачиваться история.",
  },

  players: {
    heading: "Игроки",
    you: "Вы",
    creator: "Создатель комнаты",
    ready: "Готов",
    dead: "Выбыл",
    disconnected: "Не в сети",
  },

  common: {
    cancel: "Отмена",
    close: "Закрыть",
    submit: "Отправить",
    loading: "Загрузка...",
    connectionLost: "Соединение потеряно. Переподключение...",
  },

  errors: {
    generic: "Что-то пошло не так. Попробуйте снова.",
    ROOM_NOT_FOUND: "Такой комнаты не существует.",
    NOT_HOST: "Только ведущий может это сделать.",
    INVALID_SETTINGS: "Эти настройки не подходят для такого числа игроков.",
    NOT_YOUR_TURN: "Сейчас не ваш ход.",
  },
};
