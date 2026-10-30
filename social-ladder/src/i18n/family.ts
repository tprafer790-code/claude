import type { en } from './en';

/**
 * Family edition texts (see src/edition.ts). Each table overrides the classic
 * text at the same content path or interface key; anything not listed here is
 * shared with the classic edition. Every English override needs a Spanish one,
 * so the classic Spanish text never leaks into this edition (tests/family.test.ts).
 */
type UiKey = keyof typeof en;

export const FAMILY_CONTENT_EN: Record<string, string> = {
  // ——— Parties: fictional archetypes with the classic rules ———
  'parties.pesoe.name': 'Plenty Party',
  'parties.pesoe.desc': 'Free stuff for everyone. The bill comes later.',
  'parties.pesoe.aid.label': 'Generosity cheque',
  'parties.pesoe.phases.0.title': 'Gifts for All',
  'parties.pesoe.phases.1.title': 'Smaller Gifts',
  'parties.pesoe.happenings.culture.text': 'Culture voucher: free money for culture. You buy a bobblehead of a famous painter.',

  'parties.pox.name': 'Scissors Party',
  'parties.pox.desc': 'We cut everything. Except our salaries.',
  'parties.pox.phases.0.title': 'Cuts and Ribbons',
  'parties.pox.phases.0.text': 'No aid, tariffs on everything (+15% prices), fewer opportunities and ribbon-cutting ceremonies that close your street.',
  'parties.pox.phases.0.perk.label': 'Ribbon-cutting ceremony',
  'parties.pox.phases.0.perk.text': 'A minister cuts a ribbon in your street. Income halved for 15s.',
  'parties.pox.phases.1.title': 'Trickle-Down Season',
  'parties.pox.phases.2.title': 'Paradise for Achievers',
  'parties.pox.phases.2.text': 'Zero taxes for the elite, cheap everything and a cosy consultancy contract.',
  'parties.pox.phases.2.perk.label': 'Friendly consultancy',
  'parties.pox.phases.2.perk.text': 'A ministry pays you for a report nobody will ever read.',
  'parties.pox.happenings.bulls.text': 'Free summer fair in the town square: your merchandise sells out.',
  'parties.pox.happenings.gibraltar.text': 'The minister cuts a giant ribbon with giant scissors. Everyone cheers.',
  'parties.pox.happenings.ham.text': 'Tax cut on cheese: you invest in a herd of cows.',
  'parties.pox.happenings.good_spaniard.text': 'Every shop now needs a "cost-cutting certificate". The queue is three blocks long.',
  'parties.pox.happenings.anglicisms.text': 'Budget cuts: the street lights switch off at 8 p.m. You buy candles for the shop.',

  'parties.pepe.name': 'Same Old Party',
  'parties.pepe.phases.0.title': 'Business as Usual',
  'parties.pepe.happenings.plasma.text': 'The president gives a press conference from a TV screen. Nobody understands anything.',
  'parties.pepe.happenings.m_dot.text': 'A certain "Mr. X" appears in your accounts. You have no idea who that is.',

  'parties.d22.name': 'Fresh Broom Party',
  'parties.d22.desc': 'We come to clean up the country (and leave it sparkling).',
  'parties.d22.happenings.tea.text': 'Five o\'clock tea for everyone: productivity soars.',
  'parties.d22.happenings.two_cities.text': 'They only run in two big cities: your branch in a small town hears nothing.',

  // ——— Rivals and the mystery safe: no real people ———
  'rivals.brother_in_law.name': 'Your Know-It-All Brother-in-Law',
  'rivals.influencer.name': 'The Beach-Club Influencer',
  'rivals.tech_baron.name': 'The Rocket Billionaire',
  'rivals.god.name': 'The Universe',
  'vault.status.text': 'A thank-you letter from the mayor: +1 status.',

  // ——— No alcohol: the wine becomes cheese ———
  'items.wine_cellar.name': 'Cheese Cave',
  'items.wine_cellar.desc': 'Temperature controlled. Required to have Opinions About Cheese.',
  'ranks.wine_opinion_haver.name': 'Cheese Opinion Haver',
  'ranks.wine_opinion_haver.desc': "You describe cheeses as 'cheeky'. Nobody knows what it means. Including you.",
  'combos.insufferable.desc': 'Beige clothes, vintage cheese, private elevator. All income ×1.25.',
  'combos.business_card_rolodex.hint': 'A gift of kindness, a good watch and a good cheese.',

  // ——— Hero lines ———
  'quips.idle_navel.text': 'Give me the money and stop staring at your navel.',
  'quips.idle_lottery.text': 'Waiting to win a TV quiz show? That is not a plan.',
};

export const FAMILY_CONTENT_ES: Record<string, string> = {
  'parties.pesoe.name': 'Partido de la Abundancia',
  'parties.pesoe.desc': 'Cosas gratis para todos. La factura llega después.',
  'parties.pesoe.aid.label': 'Cheque generosidad',
  'parties.pesoe.phases.0.title': 'Regalos para Todos',
  'parties.pesoe.phases.1.title': 'Regalos más Pequeños',
  'parties.pesoe.happenings.culture.text': 'Bono cultural: dinero gratis para cultura. Te compras un muñeco cabezón de un pintor famoso.',

  'parties.pox.name': 'Partido de la Tijera',
  'parties.pox.desc': 'Lo recortamos todo. Menos nuestros sueldos.',
  'parties.pox.phases.0.title': 'Recortes e Inauguraciones',
  'parties.pox.phases.0.text': 'Sin ayudas, aranceles a todo (+15 % en precios), menos oportunidades e inauguraciones con cinta que te cierran la calle.',
  'parties.pox.phases.0.perk.label': 'Corte de cinta',
  'parties.pox.phases.0.perk.text': 'Un ministro corta una cinta en tu calle. Ingresos a la mitad durante 15 s.',
  'parties.pox.phases.1.title': 'Temporada de Goteo',
  'parties.pox.phases.2.title': 'Paraíso para Triunfadores',
  'parties.pox.phases.2.text': 'Cero impuestos para la élite, todo más barato y un contrato de consultoría muy cómodo.',
  'parties.pox.phases.2.perk.label': 'Consultoría amiga',
  'parties.pox.phases.2.perk.text': 'Un ministerio te paga por un informe que nadie leerá jamás.',
  'parties.pox.happenings.bulls.text': 'Feria de verano gratis en la plaza: tu mercancía se agota.',
  'parties.pox.happenings.gibraltar.text': 'El ministro corta una cinta gigante con unas tijeras gigantes. Todo el mundo aplaude.',
  'parties.pox.happenings.ham.text': 'Rebaja de impuestos al queso: inviertes en un rebaño de vacas.',
  'parties.pox.happenings.good_spaniard.text': 'Cada tienda necesita ahora un «certificado de recortes». La cola da tres vueltas a la manzana.',
  'parties.pox.happenings.anglicisms.text': 'Recortes: las farolas se apagan a las 8 de la tarde. Compras velas para la tienda.',

  'parties.pepe.name': 'Partido de Siempre',
  'parties.pepe.phases.0.title': 'Lo de Siempre',
  'parties.pepe.happenings.plasma.text': 'El presidente da una rueda de prensa desde una pantalla de televisión. Nadie entiende nada.',
  'parties.pepe.happenings.m_dot.text': 'Un tal «Sr. X» aparece en tu contabilidad. No tienes ni idea de quién es.',

  'parties.d22.name': 'Partido Escoba Nueva',
  'parties.d22.desc': 'Venimos a limpiar el país (y a dejarlo reluciente).',
  'parties.d22.happenings.tea.text': 'Té de las cinco para todos: la productividad se dispara.',
  'parties.d22.happenings.two_cities.text': 'Solo se presentan en dos grandes ciudades: tu sucursal de pueblo no se entera de nada.',

  'rivals.brother_in_law.name': 'Tu Cuñado Sabelotodo',
  'rivals.influencer.name': 'El Influencer del Club de Playa',
  'rivals.tech_baron.name': 'El Multimillonario de los Cohetes',
  'rivals.god.name': 'El Universo',
  'vault.status.text': 'Una carta de agradecimiento del alcalde: +1 de estatus.',

  'items.wine_cellar.name': 'Cueva de Quesos',
  'items.wine_cellar.desc': 'Temperatura controlada. Necesaria para tener Opiniones sobre Quesos.',
  'ranks.wine_opinion_haver.name': 'Opinador de Quesos',
  'ranks.wine_opinion_haver.desc': 'Describes los quesos como «traviesos». Nadie sabe qué significa. Tú tampoco.',
  'combos.insufferable.desc': 'Ropa beis, queso añejo, ascensor privado. Todos los ingresos ×1,25.',
  'combos.business_card_rolodex.hint': 'Un detalle amable, un buen reloj y un buen queso.',

  'quips.idle_navel.text': 'Dame el dinero y deja de mirarte el ombligo.',
  'quips.idle_lottery.text': '¿Esperando a ganar un concurso de la tele? Eso no es un plan.',

  // ——— Dilemmas that only exist in this edition (English is in data/dilemmas.ts) ———
  'dilemmas.fat_wallet.title': '¿Quedarte la cartera gorda?',
  'dilemmas.fat_wallet.text': 'Una cartera a reventar de billetes descansa en un banco del parque. El carné es de un señor con yate, tres apellidos y ni idea de que la ha perdido.',
  'dilemmas.fat_wallet.yes.label': 'SÍ, me la quedo',
  'dilemmas.fat_wallet.yes.hint': 'Mucho efectivo. -3 de estatus: cada ascenso costará mucho más.',
  'dilemmas.fat_wallet.yes.outcomes.0.text': 'Nadie te ha visto. El señor se compra otra cartera. Y otro yate.',
  'dilemmas.fat_wallet.yes.outcomes.1.text': 'Nadie te ha visto... salvo la cartera. Llevaba un localizador GPS.',
  'dilemmas.fat_wallet.yes.outcomes.1.actions.2.label': 'Investigación policial',
  'dilemmas.fat_wallet.yes.outcomes.1.actions.2.outcomes.0.text': 'La policía sigue el pitido hasta tu sofá. La multa no es barata.',
  'dilemmas.fat_wallet.yes.outcomes.1.actions.2.outcomes.1.text': 'Al localizador se le acaba la batería antes. Sales libre.',
  'dilemmas.fat_wallet.no.label': 'NO, la devuelvo',
  'dilemmas.fat_wallet.no.hint': '+1 de estatus. Quizá una propina.',
  'dilemmas.fat_wallet.no.outcomes.0.text': 'La devuelves. El dueño te da las gracias y un yogur caducado.',
  'dilemmas.fat_wallet.no.outcomes.1.text': '¡Es millonario! Una recompensa y tu foto en el periódico.',
  'dilemmas.chicken_suit.title': '¿Llevar el disfraz de pollo para siempre?',
  'dilemmas.chicken_suit.text': 'Una cadena de comida rápida te ofrece un dineral si llevas su disfraz gigante de pollo. A todas partes. Durante el resto de esta vida.',
  'dilemmas.chicken_suit.yes.label': 'SÍ, coc-coc',
  'dilemmas.chicken_suit.yes.hint': 'Mucho dinero ya. Clics -15 % durante el resto de esta vida.',
  'dilemmas.chicken_suit.yes.outcomes.0.text': 'Eres rico y estás cubierto de plumas amarillas. Las alas son fatales para hacer clic.',
  'dilemmas.chicken_suit.yes.outcomes.0.actions.1.label': 'Alas de pollo',
  'dilemmas.chicken_suit.no.label': 'NO, conservo mi dignidad',
  'dilemmas.chicken_suit.no.hint': 'No pasa nada. Tu dignidad te lo agradece.',
  'dilemmas.chicken_suit.no.outcomes.0.text': 'Conservas tu dignidad. Te envía una tarjeta de agradecimiento.',
};

/** Interface strings. The casino becomes "Side hustles": a flea-market box and startup pitches. */
export const FAMILY_UI_EN: Partial<Record<UiKey, string>> = {
  casino: 'Side Hustles',
  casinoWarn: 'Every deal costs ½ status: nobody trusts a hustler (promotions would cost ×{mult}).',
  casinoBanned: 'With status {min} nobody will do business with you. Clean up your image first.',
  scratchTitle: 'Flea-Market Mystery Box',
  scratchDesc: 'Open the 9 slots: three matching finds sell for a profit. The box costs {price} (3% of your cash) and ½ status.',
  scratchBuy: 'Buy a box · {price}',
  scratchAll: 'Open everything',
  scratchNothing: 'Just junk. The seller waves goodbye.',
  scratchRefund: 'Three vintage teddies: +{amount}',
  scratchTriple: 'Three antique radios: +{amount}!',
  scratchStatus: 'Three trophies: +{amount} and +2 status!',
  scratchJackpot: 'TREASURE! +{amount}',
  scratchFine: 'Three smelly socks: the whole street can smell it. -2 status.',
  rouletteTitle: 'Startup Pitch',
  rouletteDesc: 'Back a startup. Solid or trendy pays ×2 if it works. A moonshot pays ×36 and +2 status. Every pitch costs ½ status, and a market crash costs 1 more.',
  red: 'Solid',
  black: 'Trendy',
  number: 'Moonshot',
  stake: 'Invest',
  spin: 'Invest · {stake}',
  rouletteWin: 'It worked! You get {amount}',
  rouletteLose: 'It flopped. You lose {stake}.',
  rouletteZero: 'Market crash! Your name is in the headlines: -1 status.',
  help_casino_t: 'Side hustles',
  help_casino: 'In the ☰ menu you now have flea-market boxes and startup pitches. Each deal costs money and half a status point.',
  help_aid: 'With the Plenty Party in power you can ask for aid every 60 s. It is free money, but every aid raises all prices by 3% (up to +102%), as in real life. The other parties slowly bring prices back down.',
  help_inflation: 'So much aid has a cost: every price in the shop is higher now. Vote for any other party to bring prices down slowly.',
  amnestyHint: "The Same Old Party's amnesty: bring it home paying only 10%.",
  statusPayoutLoss: 'Shady money: +{amount}',
};

export const FAMILY_UI_ES: Partial<Record<UiKey, string>> = {
  casino: 'Buscavidas',
  casinoWarn: 'Cada trato cuesta ½ punto de estatus: nadie se fía de un buscavidas (los ascensos costarían ×{mult}).',
  casinoBanned: 'Con estatus {min} nadie quiere hacer negocios contigo. Lava tu imagen primero.',
  scratchTitle: 'Caja sorpresa del rastro',
  scratchDesc: 'Abre las 9 casillas: tres hallazgos iguales se venden con beneficio. La caja cuesta {price} (3 % de tu efectivo) y ½ punto de estatus.',
  scratchBuy: 'Comprar caja · {price}',
  scratchAll: 'Abrirlo todo',
  scratchNothing: 'Solo trastos. El vendedor te dice adiós con la mano.',
  scratchRefund: 'Tres osos de peluche antiguos: +{amount}',
  scratchTriple: 'Tres radios antiguas: ¡+{amount}!',
  scratchStatus: 'Tres trofeos: ¡+{amount} y +2 de estatus!',
  scratchJackpot: '¡TESORO! +{amount}',
  scratchFine: 'Tres calcetines apestosos: toda la calle lo huele. -2 de estatus.',
  rouletteTitle: 'Presenta tu startup',
  rouletteDesc: 'Apoya una startup. Sólida o de moda paga ×2 si sale bien. Un proyecto lunar paga ×36 y +2 de estatus. Cada presentación cuesta ½ punto de estatus, y un desplome del mercado cuesta 1 más.',
  red: 'Sólida',
  black: 'De moda',
  number: 'Lunar',
  stake: 'Invertir',
  spin: 'Invertir · {stake}',
  rouletteWin: '¡Ha funcionado! Ganas {amount}',
  rouletteLose: 'Ha fracasado. Pierdes {stake}.',
  rouletteZero: '¡Desplome del mercado! Tu nombre sale en los titulares: -1 de estatus.',
  help_casino_t: 'Buscavidas',
  help_casino: 'En el menú ☰ ya tienes cajas sorpresa del rastro y presentaciones de startups. Cada trato cuesta dinero y medio punto de estatus.',
  help_aid: 'Con el Partido de la Abundancia en el Gobierno puedes pedir ayudas cada 60 s. Es dinero gratis, pero cada ayuda sube todos los precios un 3 % (hasta +102 %), como en la realidad. Los demás partidos bajan los precios poco a poco.',
  help_inflation: 'Tanta ayuda tiene un coste: todos los precios de la tienda han subido. Vota a cualquier otro partido para bajarlos poco a poco.',
  amnestyHint: 'Amnistía del Partido de Siempre: lo traes a casa pagando solo el 10 %.',
  statusPayoutLoss: 'Dinero turbio: +{amount}',
};

/** Interface keys that the family edition never shows (dates, children, squats). */
export const FAMILY_UNUSED_UI: UiKey[] = [
  'housingTitle', 'housingText', 'noticeStress', 'okupaPill', 'help_okupa_t', 'help_okupa', 'help_children_t', 'help_children',
  'childSupportLabel', 'romanceSafeLabel', 'romanceWildLabel', 'romanceKicker', 'romanceSafe', 'romanceSafeHint', 'romanceWild',
  'romanceWildHint', 'romanceLeave', 'romanceLeaveHint', 'fadeText', 'romanceSafeResult', 'romanceWildResult', 'romancePregnant',
  'romanceLeaveResult', 'babyTitle', 'babyText', 'childSupportTitle', 'childSupportText', 'unlockDates',
];
