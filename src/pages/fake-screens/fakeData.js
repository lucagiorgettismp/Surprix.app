// All hardcoded fake data for marketing screenshots

export const MARIO_USERNAME = 'mariorossi'
export const GIULIA_USERNAME = 'giuliaverdi'

export const MARIO_AUTH_USER = {
  uid: 'fake-mario-uid',
  email: 'mario@example.com',
  displayName: 'Mario Rossi',
  providerData: [{ providerId: 'google.com' }],
}

export const MARIO_PROFILE = {
  username: 'mariorossi',
  country: 'IT',
  email: 'mario@example.com',
}

// 8 reviews — avg 4.75 shown as 4.7
export const FAKE_FEEDBACKS = [
  {
    id: 'fb1',
    from: 'giuliaverdi',
    rating: 5,
    comment: 'Ottimo collezionista, ci riscambierei senza dubbio. Molto disponibile e puntuale, ha spedito appena ci siamo accordati.',
    createdAt: new Date('2026-05-10').getTime(),
  },
  {
    id: 'fb2',
    from: 'luca_m',
    rating: 5,
    comment: 'Scambio perfetto, puntuale e gentile. Spedizione curata e veloce!',
    createdAt: new Date('2026-05-05').getTime(),
  },
  {
    id: 'fb3',
    from: 'sara_col',
    rating: 5,
    comment: 'Tutto ok, consigliato! Ottima comunicazione.',
    createdAt: new Date('2026-04-28').getTime(),
  },
  {
    id: 'fb4',
    from: 'marco_kinder',
    rating: 4,
    comment: 'Scambio riuscito, piccolo ritardo ma si è fatto perdonare!',
    createdAt: new Date('2026-04-20').getTime(),
  },
  {
    id: 'fb5',
    from: 'anna_p',
    rating: 5,
    comment: 'Serissimo, super consigliato!',
    createdAt: new Date('2026-04-10').getTime(),
  },
  {
    id: 'fb6',
    from: 'francesca_v',
    rating: 5,
    comment: 'Perfetto in tutto, dalla comunicazione alla spedizione.',
    createdAt: new Date('2026-03-28').getTime(),
  },
  {
    id: 'fb7',
    from: 'matteo_cx',
    rating: 4,
    comment: 'Bravo, scambio concluso senza problemi.',
    createdAt: new Date('2026-03-15').getTime(),
  },
  {
    id: 'fb8',
    from: 'elena_col',
    rating: 5,
    comment: 'Prima volta che scambio con lui, niente da dire. Tornerò!',
    createdAt: new Date('2026-03-01').getTime(),
  },
]

export const AVG_RATING =
  FAKE_FEEDBACKS.reduce((s, f) => s + f.rating, 0) / FAKE_FEEDBACKS.length

export const FAKE_CHAT_MESSAGES = [
  {
    id: 'msg1',
    from: 'giuliaverdi',
    text: 'Ciao! Ho visto che cerchi Will VC259 dei Merendero 2026',
    createdAt: new Date('2026-05-12T09:14:00').getTime(),
  },
  {
    id: 'msg2',
    from: 'mariorossi',
    text: "Sì esatto! Ce l'hai in doppio?",
    createdAt: new Date('2026-05-12T09:16:00').getTime(),
  },
  {
    id: 'msg3',
    from: 'giuliaverdi',
    text: "Sì! Io cerco Tecna delle Winx, la S-556, ce l'hai?",
    createdAt: new Date('2026-05-12T09:18:00').getTime(),
  },
  {
    id: 'msg4',
    from: 'mariorossi',
    text: "Ce l'ho! Ma hai un'idea di quanto vale?!?",
    createdAt: new Date('2026-05-12T09:20:00').getTime(),
  },
]

// ID delle sorpresine specifiche da usare negli screen
export const VC259_ID   = 'Kinder_2026_001_VC259'
export const S556_ID    = 'Kinder_2005_WINX6_S-556'
export const HPANI06_ID = 'Esselunga_2019_HPANI_06'

// Stat fake di marketing da sovrapporre ai dati reali DB
// Solo missing_count e double_count: tutto il resto (inclusi rarity e rarity_auto) viene dal DB
export const VC259_FAKE_STATS   = { missing_count: 47, double_count: 3  }
export const S556_FAKE_STATS    = { missing_count: 23, double_count: 8  }
export const HPANI06_FAKE_STATS = { missing_count: 12, double_count: 31 }

/**
 * Sovrappone le stat fake di marketing su un item reale del DB.
 * Se l'item non è ancora caricato (array vuoto iniziale), restituisce null.
 */
export const applyFakeStats = (dbItem, fakeStats) =>
  dbItem && !Array.isArray(dbItem) ? { ...dbItem, ...fakeStats } : null
