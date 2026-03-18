/* ── MaykasKitchen i18n ───────────────────────────────────── */
(function () {
  'use strict';

  const T = {
    sv: {
      /* NAV */
      'nav.home':    'Hem',
      'nav.recipes': 'Recept',
      'nav.collab':  'Samarbeten',
      'nav.contact': 'Kontakt',
      'nav.buybook': 'Köp min bok →',
      'nav.open':    'Öppna meny',
      /* HERO */
      'hero.eyebrow': 'SuryoyoFood',
      'hero.w1': 'Mat',
      'hero.w2': 'från',
      'hero.w3': 'hjärtat',
      'hero.w5': 'själen',
      'hero.sub': 'Säsongsbaserad matlagning som skapar glädje runt bordet<br>för hela familjen – med autentiska assyriska/syrianska rötter.',
      'hero.btn.recipes':   'Utforska recept',
      'hero.btn.book':      'Köp min bok',
      'hero.btn.instagram': 'Följ på Instagram',
      'hero.follow': 'Följ mig',
      'hero.scroll': 'Scrolla',
      /* RECIPES SECTION */
      'recipes.label': 'Matinspiration',
      'recipes.title': 'Populära recept',
      'recipes.desc':  'Autentiska assyriska och syrianska rätter kombinerade med moderna smaker – enkla tillagningsmetoder och djupa, äkta smaker som hela familjen älskar.',
      'recipes.all':   'Se alla recept',
      'recipes.count': '13+ autentiska recept från Mayka',
      /* SHARED RECIPE UI */
      'badge.popular': 'Populärt',
      'recipe.view':   'Visa recept →',
      /* TAGS */
      'tag.bakverk':       'Bakverk',
      'tag.assyriskt':     'Assyriskt',
      'tag.traditionellt': 'Traditionellt',
      'tag.vegetariskt':   'Vegetariskt',
      'tag.vegan':         'Vegan',
      'tag.snabb':         'Snabb',
      'tag.fisk':          'Fisk',
      'tag.under60':       'Under 60 min',
      'tag.kott':          'Kött',
      'tag.syrianskt':     'Syrianskt',
      /* RECIPE CARDS */
      'rc1.name':     'Qrimyothe – Mormors munkar 🍩',
      'rc1.desc':     'Mamma berättar om mormors kärlek i varje tugga. Mer än bara ett recept – ett stycke historia.',
      'rc1.portions': '20 portioner',
      'rc2.name':     'Krämigaste kikärts-tikka masalan 🤯🔥',
      'rc2.desc':     'En gryta som kramar om både hjärta och smaklökar – den krämigaste tikka masalan du kan tänka dig.',
      'rc2.portions': '4–6 portioner',
      'rc3.name':     'Kryddig lax- &amp; risbowl',
      'rc3.desc':     'Perfekt som fräsch vardagsmiddag eller när du vill lyxa till lunchen. Snabbt, enkelt och smakrikt.',
      'rc3.portions': '4 portioner',
      'rc4.name':     'Kafta bil sejnie',
      'rc4.desc':     'Traditionell rätt från Mellanöstern med saftiga köttbullar och potatis i smakrik tomatsås.',
      'rc4.portions': '5–6 portioner',
      'rc5.name':     'Lins- &amp; bulgurjärpar med sumak 🌿',
      'rc5.desc':     'Proteinrika vegetariska järpar med linser, bulgur och sumak – fylliga smaker från Mellanöstern.',
      'rc5.portions': '4–6 portioner',
      'rc6.name':     'Köfta bil Sanieh 🍅',
      'rc6.desc':     'Syrisk ugnsrätt med kryddig köttfärs, potatis och padron paprika i mustig tomatsås.',
      'rc6.portions': '8 portioner',
      /* CTA */
      'cta.label':       'Kontakt &amp; Samarbeten',
      'cta.heading':     'Låt oss skapa<br>tillsammans',
      'cta.sub':         'Matlagning, recept och berättelser som engagerar – redo för nästa projekt.',
      'cta.card1.title': 'Samarbeten',
      'cta.card1.body':  'Kampanjer, receptutveckling, matfoto, videos och events – autentiskt innehåll som engagerar.',
      'cta.card2.title': 'Min bok',
      'cta.card2.body':  '<em>Maykas gröna kök – Kutle, hummus och kärlek.</em> En resa genom smak, traditioner och kärlek.',
      'cta.card2.btn':   'Köp boken →',
      /* FOOTER */
      'footer.tagline':  'Mat från hjärtat &amp; tro i själen.<br>Assyriska/Syrianska rötter, alltid lagat med kärlek.',
      'footer.explore':  'Utforska',
      'footer.nl.title': 'Nyhetsbrev',
      'footer.nl.p':     'Få nya recept och matinspiration direkt i din inkorg!',
      'footer.nl.btn':   'Prenumerera',
      'footer.copy':     '© 2025 MaykasKitchen. Alla rättigheter förbehållna.',
      'footer.made':     'Skapad med ♥ i Skåne, Sverige',
      /* POPUP */
      'popup.title':      'Matglädje<br><em>direkt i din inkorg</em>',
      'popup.sub':        'Nya recept, säsongsinspirat­ion och exklusiva erbjudanden – gratis varje månad.',
      'popup.btn':        'Prenumerera gratis',
      'popup.success':    '<span>✓</span> Tack! Du är nu med i gemenskapen 🌿',
      'popup.or':         'eller',
      'popup.book.title': 'Köp min bok',
      'popup.book.sub':   'Maykas gröna kök – Kutle, hummus och kärlek',
      /* RECEPT PAGE */
      'back':           'Tillbaka',
      'r.loading':      'Laddar recept…',
      'r.notfound.h':   'Recept hittades inte',
      'r.notfound.p':   'Det här receptet finns inte.',
      'r.notfound.btn': '← Tillbaka till recept',
      'r.ingredients':  'Ingredienser',
      'r.instructions': 'Tillagning',
      'r.tips':         'Tips',
      'r.portions':     'portioner',
      'r.min':          'min',
    },
    en: {
      /* NAV */
      'nav.home':    'Home',
      'nav.recipes': 'Recipes',
      'nav.collab':  'Collaborations',
      'nav.contact': 'Contact',
      'nav.buybook': 'Buy my book →',
      'nav.open':    'Open menu',
      /* HERO */
      'hero.eyebrow': 'SuryoyoFood',
      'hero.w1': 'Food',
      'hero.w2': 'from',
      'hero.w3': 'the heart',
      'hero.w5': 'the soul',
      'hero.sub': 'Seasonal cooking that brings joy to the table for the whole family – with authentic Assyrian/Syriac roots.',
      'hero.btn.recipes':   'Explore recipes',
      'hero.btn.book':      'Buy my book',
      'hero.btn.instagram': 'Follow on Instagram',
      'hero.follow': 'Follow me',
      'hero.scroll': 'Scroll',
      /* RECIPES SECTION */
      'recipes.label': 'Food inspiration',
      'recipes.title': 'Popular recipes',
      'recipes.desc':  'Authentic Assyrian and Syriac dishes combined with modern flavours – simple methods and deep, genuine tastes the whole family will love.',
      'recipes.all':   'See all recipes',
      'recipes.count': '13+ authentic recipes by Mayka',
      /* SHARED RECIPE UI */
      'badge.popular': 'Popular',
      'recipe.view':   'View recipe →',
      /* TAGS */
      'tag.bakverk':       'Pastry',
      'tag.assyriskt':     'Assyrian',
      'tag.traditionellt': 'Traditional',
      'tag.vegetariskt':   'Vegetarian',
      'tag.vegan':         'Vegan',
      'tag.snabb':         'Quick',
      'tag.fisk':          'Fish',
      'tag.under60':       'Under 60 min',
      'tag.kott':          'Meat',
      'tag.syrianskt':     'Syriac',
      /* RECIPE CARDS */
      'rc1.name':     "Qrimyothe – Grandma's doughnuts 🍩",
      'rc1.desc':     "Mum tells of grandma's love in every bite. More than just a recipe – a piece of history.",
      'rc1.portions': '20 servings',
      'rc2.name':     'Creamiest chickpea tikka masala 🤯🔥',
      'rc2.desc':     'A stew that hugs both heart and taste buds – the creamiest tikka masala you can imagine.',
      'rc2.portions': '4–6 servings',
      'rc3.name':     'Spicy salmon &amp; rice bowl',
      'rc3.desc':     'Perfect as a fresh weekday dinner or when you want to elevate lunch. Quick, easy and flavourful.',
      'rc3.portions': '4 servings',
      'rc4.name':     'Kafta bil sejnie',
      'rc4.desc':     'Traditional Middle Eastern dish with juicy meatballs and potatoes in a rich tomato sauce.',
      'rc4.portions': '5–6 servings',
      'rc5.name':     'Lentil &amp; bulgur patties with sumac 🌿',
      'rc5.desc':     'Protein-rich vegetarian patties with lentils, bulgur and sumac – hearty Middle Eastern flavours.',
      'rc5.portions': '4–6 servings',
      'rc6.name':     'Köfta bil Sanieh 🍅',
      'rc6.desc':     'Syrian oven dish with spiced minced meat, potatoes and padron peppers in a rich tomato sauce.',
      'rc6.portions': '8 servings',
      /* CTA */
      'cta.label':       'Contact &amp; Collaborations',
      'cta.heading':     "Let's create<br>together",
      'cta.sub':         'Cooking, recipes and stories that engage – ready for the next project.',
      'cta.card1.title': 'Collaborations',
      'cta.card1.body':  'Campaigns, recipe development, food photography, videos and events – authentic content that engages.',
      'cta.card2.title': 'My book',
      'cta.card2.body':  "<em>Mayka's green kitchen – Kutle, hummus and love.</em> A journey through flavour, traditions and love.",
      'cta.card2.btn':   'Buy the book →',
      /* FOOTER */
      'footer.tagline':  'Food from the heart &amp; faith in the soul.<br>Assyrian/Syriac roots, always cooked with love.',
      'footer.explore':  'Explore',
      'footer.nl.title': 'Newsletter',
      'footer.nl.p':     'Get new recipes and food inspiration straight to your inbox!',
      'footer.nl.btn':   'Subscribe',
      'footer.copy':     '© 2025 MaykasKitchen. All rights reserved.',
      'footer.made':     'Made with ♥ in Skåne, Sweden',
      /* POPUP */
      'popup.title':      'Food joy<br><em>straight to your inbox</em>',
      'popup.sub':        'New recipes, seasonal inspiration and exclusive offers – free every month.',
      'popup.btn':        'Subscribe for free',
      'popup.success':    '<span>✓</span> Thank you! You are now part of the community 🌿',
      'popup.or':         'or',
      'popup.book.title': 'Buy my book',
      'popup.book.sub':   "Mayka's green kitchen – Kutle, hummus and love",
      /* RECEPT PAGE */
      'back':           'Back',
      'r.loading':      'Loading recipe…',
      'r.notfound.h':   'Recipe not found',
      'r.notfound.p':   'This recipe does not exist.',
      'r.notfound.btn': '← Back to recipes',
      'r.ingredients':  'Ingredients',
      'r.instructions': 'Instructions',
      'r.tips':         'Tips',
      'r.portions':     'servings',
      'r.min':          'min',
    }
  };

  window.MK_LANG = localStorage.getItem('mk-lang') || 'sv';

  window.getT = function (key) {
    return (T[window.MK_LANG] && T[window.MK_LANG][key]) || (T.sv[key]) || key;
  };

  window.applyLang = function (lang) {
    window.MK_LANG = lang;
    localStorage.setItem('mk-lang', lang);
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const val = T[lang] && T[lang][el.dataset.i18n];
      if (val !== undefined) el.innerHTML = val;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const val = T[lang] && T[lang][el.dataset.i18nPh];
      if (val !== undefined) el.placeholder = val;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const val = T[lang] && T[lang][el.dataset.i18nAria];
      if (val !== undefined) el.setAttribute('aria-label', val);
    });

    document.querySelectorAll('.lang-toggle').forEach(btn => {
      btn.textContent = lang === 'sv' ? 'EN' : 'SV';
    });

    /* Re-render recipe page if present */
    if (typeof window.MK_RENDER === 'function') window.MK_RENDER();
  };

  window.initLangToggle = function () {
    document.querySelectorAll('.lang-toggle').forEach(btn => {
      btn.textContent = window.MK_LANG === 'sv' ? 'EN' : 'SV';
      btn.addEventListener('click', () => {
        window.applyLang(window.MK_LANG === 'sv' ? 'en' : 'sv');
      });
    });
    if (window.MK_LANG !== 'sv') window.applyLang(window.MK_LANG);
  };
}());
