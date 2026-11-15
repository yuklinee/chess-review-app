export type PlayerColor = 'white' | 'black'

export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'daily'

export type GameOutcome = 'white' | 'black' | 'draw'

export type PlayerOutcome = 'win' | 'loss' | 'draw'

export interface GamePlayer {
  username: string
  rating?: number
  result: string
  '@id'?: string
  uuid?: string
}

export interface Accuracies {
  white?: number
  black?: number
}

export interface ChessComGame {
  url: string
  pgn: string
  time_control: string
  time_class: TimeClass | string
  end_time: number
  start_time?: number
  rated: boolean
  rules?: string
  white: GamePlayer
  black: GamePlayer
  eco?: string
  accuracies?: Accuracies
  uuid?: string
  initial_setup?: string
  fen?: string
}

export interface PlayerProfile {
  avatar?: string
  player_id?: number
  '@id'?: string
  url?: string
  username: string
  name?: string
  title?: string
  followers?: number
  country?: string
  location?: string
  last_online?: number
  joined?: number
  status?: string
  is_streamer?: boolean
  verified?: boolean
  league?: string
}

export interface RatingRecord {
  win?: number
  loss?: number
  draw?: number
}

export interface RatingStats {
  last?: {
    rating?: number
    date?: number
    rd?: number
  }
  best?: {
    rating?: number
    date?: number
    game?: string
  }
  record?: RatingRecord
}

export interface PlayerStats {
  chess_bullet?: RatingStats
  chess_blitz?: RatingStats
  chess_rapid?: RatingStats
  chess_daily?: RatingStats
  tactics?: {
    highest?: {
      rating?: number
      date?: number
    }
  }
  fide?: number
}

export interface ArchivesResponse {
  archives?: string[]
}

export interface GamesResponse {
  games?: ChessComGame[]
}

export interface PlayerGames {
  games: ChessComGame[]
  archiveUrl: string | null
  archivesChecked: number
  usedFallback: boolean
}

export interface PlayerSearchResult extends PlayerGames {
  username: string
  profile: PlayerProfile | null
  stats: PlayerStats | null
}
