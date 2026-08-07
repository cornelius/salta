import type { MessageKey } from './en'

/** German, the language the rules were printed in. */
export const de: Record<MessageKey, string> = {
  'app.title': 'Salta',
  'app.subtitle': 'Ein Brettspiel für 2 Personen, erschienen 1899',

  'player.green': 'Grün',
  'player.red': 'Rot',

  'turn.toMove': '{player} ist am Zug',
  'turn.mustJump': '{player} muss springen',
  'turn.jumpAvailable': '{player} hat einen Sprung und muss ihn ausführen',

  'salta.call': 'Salta!',
  'salta.prompt': '{player} hat einen Sprung übersehen. Rufe Salta, um den Zug zurückzunehmen.',
  'salta.hint': 'Der Ruf nimmt den Zug zurück und erzwingt den Sprung.',
  'salta.letStand': 'Stehen lassen',
  'salta.called': 'Salta! {player} muss springen.',

  'status.moves': 'Gezogen',
  'status.remaining': 'Noch zu ziehen',
  'status.limit': 'von {limit}',

  'outcome.home': '{winner} ist am Ziel. {loser} verliert {points} Points.',
  'outcome.limit': 'Zuggrenze erreicht. {winner} gewinnt mit {points} Points.',
  'outcome.draw': 'Unentschieden.',

  'control.newGame': 'Neues Spiel',
  'control.tournament': 'Turnier-Regel',
  'control.tournamentHint': 'Nach je {limit} Zügen abbrechen und die Differenz werten.',
  'control.copy': 'Großmutti-Exemplar',
  'control.copyHint':
    'Brett und Steine so, wie dieses Spiel heute ist: mit dem eingezeichneten Schachfeld und zwei durch Pappscheiben ersetzten Steinen.',
  'control.language': 'Sprache',
  'control.rules': 'Spielregeln',

  'rules.link': 'Die Originalregeln lesen',
  'a11y.board': 'Saltabrett, zehn mal zehn Felder',
  'a11y.piece': '{player} {device} {rank} auf {square}',
  'device.sun': 'Sonne',
  'device.moon': 'Mond',
  'device.star': 'Stern',
}
