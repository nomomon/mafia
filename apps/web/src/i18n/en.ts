export const en = {
  appName: "Mafia",
  skipToContent: "Skip to content",

  home: {
    title: "Mafia",
    subtitle: "Your phone is the referee. Talk out loud, play in person.",
    nameLabel: "Your name",
    namePlaceholder: "e.g. Alex",
    nameRequired: "Please enter your name.",
    languageLabel: "Game language",
    createHeading: "Host a new game",
    createButton: "Create room",
    joinHeading: "Join a game",
    roomCodeLabel: "Room code",
    roomCodePlaceholder: "e.g. ABCD",
    roomCodeRequired: "Please enter a room code.",
    joinButton: "Join room",
    connecting: "Connecting to server...",
  },

  lobby: {
    title: "Lobby",
    roomCode: "Room code",
    copyCode: "Copy room code",
    codeCopied: "Room code copied!",
    players: "Players ({count})",
    settingsHeading: "Game settings",
    mafiaCount: "Number of mafia",
    decreaseMafia: "Decrease mafia count",
    increaseMafia: "Increase mafia count",
    hasDoctor: "Include doctor",
    hasSheriff: "Include sheriff",
    minPlayersWarning: "Need at least {count} players for these settings ({have} joined).",
    readyExplainer: "Anyone can adjust the settings. The game starts once a majority of players mark themselves ready.",
    readyCount: "{count} of {required} needed are ready.",
    markReady: "I'm ready",
    cancelReady: "Not ready yet",
  },

  role: {
    heading: "Your role",
    mafia: "Mafia",
    doctor: "Doctor",
    sheriff: "Sheriff",
    civilian: "Civilian",
    mafiaDesc: "Each night, secretly choose a victim with the other mafia. Blend in during the day.",
    doctorDesc: "Each night, choose one player to protect from the mafia.",
    sheriffDesc: "Each night, investigate one player to learn if they are mafia.",
    civilianDesc: "You have no special powers. Use discussion and votes to find the mafia.",
    dismiss: "Got it",
  },

  phase: {
    lobby: "Lobby",
    night: "Night",
    night_resolve: "Resolving the night...",
    day_reveal: "Morning news",
    day_discussion: "Discussion",
    day_vote: "Voting",
    vote_resolve: "Counting votes...",
    game_over: "Game over",
  },

  night: {
    yourTurn: "It's your turn to act.",
    mafiaPrompt: "Choose a player to eliminate:",
    doctorPrompt: "Choose a player to protect:",
    sheriffPrompt: "Choose a player to investigate:",
    civilianWaiting: "Night has fallen. Sit tight while others act.",
    waitingForOthers: "Waiting for other players to finish their night actions...",
    actionSubmitted: "Action submitted. Waiting for the night to resolve.",
    sheriffResultHeading: "Investigation result",
    sheriffResultMafia: "{name} is mafia!",
    sheriffResultInnocent: "{name} is not mafia.",
    readyToSkip: "Ready to move on without waiting",
    continueReady: "Ready to continue",
  },

  vote: {
    heading: "Cast your vote",
    prompt: "Vote for the player you think is mafia:",
    abstain: "Abstain",
    voteSubmitted: "Vote submitted. Waiting for others.",
    readyToVote: "Ready to start the vote",
    tally: "Votes: {count}",
  },

  gameOver: {
    heading: "Game over",
    townWins: "The town wins!",
    mafiaWins: "The mafia wins!",
    backToHome: "Back to home",
  },

  narrator: {
    heading: "Narrator log",
    empty: "The story will unfold here.",
  },

  players: {
    heading: "Players",
    you: "You",
    creator: "Room creator",
    ready: "Ready",
    dead: "Eliminated",
    disconnected: "Disconnected",
  },

  common: {
    cancel: "Cancel",
    close: "Close",
    submit: "Submit",
    loading: "Loading...",
    connectionLost: "Connection lost. Reconnecting...",
  },

  errors: {
    generic: "Something went wrong. Please try again.",
    ROOM_NOT_FOUND: "That room code doesn't exist.",
    NOT_HOST: "Only the host can do that.",
    INVALID_SETTINGS: "Those settings aren't valid for this many players.",
    NOT_YOUR_TURN: "It's not your turn to act.",
  },
} as const;

type Widen<T> = T extends string
  ? string
  : T extends object
    ? { [K in keyof T]: Widen<T[K]> }
    : T;

export type TranslationDict = Widen<typeof en>;
