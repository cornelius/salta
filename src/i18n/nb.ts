import type { MessageKey } from './en'

/** Norwegian, in the Bokmål written standard. */
export const nb: Record<MessageKey, string> = {
  'app.title': 'Salta',
  'app.subtitle': 'Et brettspill for to, første gang utgitt i 1899',

  'player.green': 'Grønn',
  'player.red': 'Rød',

  'turn.toMove': '{player} har trekket',
  'turn.mustJump': '{player} må hoppe',
  'turn.jumpAvailable': '{player} har et hopp og må ta det',

  'salta.call': 'Salta!',
  'salta.prompt': '{player} lot et hopp gå fra seg. Rop Salta for å ta trekket tilbake.',
  'salta.hint': 'Ropet tar trekket tilbake og tvinger fram hoppet.',
  'salta.letStand': 'La det stå',
  'salta.called': 'Salta! {player} må ta hoppet.',

  'restart.prompt': 'Dette gir opp spillet som pågår og begynner et nytt.',
  'restart.start': 'Nytt spill',
  'restart.keep': 'Spill videre',

  'status.target': 'Hvor brikkene skal ende',
  'status.moves': 'Trekk gjort',
  'status.remaining': 'Trekk igjen',
  'status.limit': 'av {limit}',

  'outcome.home': '{winner} er i mål. {loser} taper {points} poeng.',
  'outcome.limit': 'Trekkgrensen er nådd. {winner} vinner med {points} poeng.',
  'outcome.draw': 'Uavgjort.',

  'control.newGame': 'Nytt spill',
  'control.opponent': 'Motstander',
  'opponent.human': 'To spillere',
  'opponent.easy': 'Lett',
  'opponent.medium': 'Middels',
  'opponent.hard': 'Vanskelig',
  'control.youPlay': 'Du spiller',
  'control.tournament': 'Turneringsregel',
  'control.tournamentHint': 'Avslutt etter {limit} trekk hver og regn differansen.',
  'control.copy': 'Bestemors eksemplar',
  'control.copyHint':
    'Brettet og brikkene slik dette settet er i dag: med sjakkrutene tegnet på, og to brikker erstattet av papp.',
  'control.language': 'Språk',
  'control.rules': 'Spilleregler',

  'rules.link': 'Les de opprinnelige reglene',
  'rules.version': 'Utgave',
  'rules.facsimile': 'Faksimile',
  'a11y.board': 'Salta-brett, ti ganger ti ruter',
  'a11y.target': 'Brettet i mål: hver side rett overfor der den startet, i samme rekkefølge',
  'a11y.piece': '{player} {device} {rank} på {square}',
  'device.sun': 'sol',
  'device.moon': 'måne',
  'device.star': 'stjerne',
}
