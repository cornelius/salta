/** English is the source locale: every other locale is checked against these keys. */
export const en = {
  'app.title': 'Salta',
  'app.subtitle': 'A board game for two, first published in 1899',

  'player.green': 'Green',
  'player.red': 'Red',

  'turn.toMove': '{player} to move',
  'turn.mustJump': '{player} must jump',
  'turn.jumpAvailable': '{player} has a jump and must take it',

  'salta.call': 'Salta!',
  'salta.prompt': '{player} passed up a jump. Call Salta to take the move back.',
  'salta.hint': 'Calling takes the move back and forces the jump.',
  'salta.letStand': 'Let it stand',
  'salta.called': 'Salta! {player} must take the jump.',

  'status.target': 'Where the pieces end up',
  'status.moves': 'Moves played',
  'status.remaining': 'Moves still to go',
  'status.limit': 'of {limit}',

  'outcome.home': '{winner} is home. {loser} loses {points} points.',
  'outcome.limit': 'Move limit reached. {winner} wins by {points} points.',
  'outcome.draw': 'Drawn game.',

  'control.newGame': 'New game',
  'control.tournament': 'Tournament rule',
  'control.tournamentHint': 'End after {limit} moves each and score the difference.',
  'control.copy': "Grandma's copy",
  'control.copyHint':
    'The board and pieces as this set is now: the chess frame ruled onto it, and two pieces replaced with card.',
  'control.language': 'Language',
  'control.rules': 'Rules',

  'rules.link': 'Read the original rules',
  'rules.version': 'Version',
  'rules.facsimile': 'Facsimile',
  'a11y.board': 'Salta board, ten by ten squares',
  'a11y.target': 'The finished board: each side across from where it started, in the same order',
  'a11y.piece': '{player} {device} {rank} on {square}',
  'device.sun': 'sun',
  'device.moon': 'moon',
  'device.star': 'star',
} as const

export type MessageKey = keyof typeof en
