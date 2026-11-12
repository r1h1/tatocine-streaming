/**
 * TatoCine · js/core/handlers.js
 * Manejadores del HTML estático (antes eran atributos onclick/onkeydown en index.html).
 * GENERADO al migrar a una CSP sin 'unsafe-inline': cada atributo `data-h="hN"` / `data-hk="hN"` ejecuta la función
 * hN con `this` = el elemento y `event` = el evento (ver el despachador en core/actions.js).
 */
var TC_H = {};
TC_H.h1 = function (event) { // click
  toggleMenu()
};
TC_H.h2 = function (event) { // click
  switchView('home');
  toggleMenu();
};
TC_H.h3 = function (event) { // click
  switchView('movies');
  toggleMenu();
};
TC_H.h4 = function (event) { // click
  switchView('anime');
  toggleMenu();
};
TC_H.h5 = function (event) { // click
  switchView('series');
  toggleMenu();
};
TC_H.h6 = function (event) { // click
  switchView('kids');
  toggleMenu();
};
TC_H.h7 = function (event) { // click
  switchView('list');
  toggleMenu();
};
TC_H.h8d = function (event) { // click (menú de escritorio)
  openLegalHub()
};
TC_H.h8 = function (event) { // click
  openLegalHub();
  toggleMenu();
};
TC_H.h9 = function (event) { // click
  switchView('home')
};
TC_H.h10 = function (event) { // click
  switchView('movies')
};
TC_H.h11 = function (event) { // click
  switchView('anime')
};
TC_H.h12 = function (event) { // click
  switchView('series')
};
TC_H.h13 = function (event) { // click
  switchView('kids')
};
TC_H.h14 = function (event) { // click
  switchView('list')
};
TC_H.h15 = function (event) { // click
  installApp()
};
TC_H.h16 = function (event) { // click
  toggleAppFullscreen()
};
TC_H.h17 = function (event) { // click
  showSettings()
};
TC_H.h18 = function (event) { // click
  showProfiles()
};
TC_H.h19 = function (event) { // click
  openHeroDetails()
};
TC_H.h20 = function (event) { // click
  openWizard()
};
TC_H.h21 = function (event) { // click
  toggleHeroSave(event)
};
TC_H.h22 = function (event) { // click
  togglePlayerFullscreen()
};
TC_H.h23 = function (event) { // click
  closePlayer()
};
TC_H.h24 = function (event) { // click
  toggleAutoNextEpisode()
};
TC_H.h25 = function (event) { // click
  closeDetails()
};
TC_H.h26 = function (event) { // click
  toggleDetailsFav()
};
TC_H.h27 = function (event) { // click
  scrollCast(this, -1)
};
TC_H.h28 = function (event) { // click
  scrollCast(this, 1)
};
TC_H.h29 = function (event) { // click
  scrollSimilar(this, -1)
};
TC_H.h30 = function (event) { // click
  scrollSimilar(this, 1)
};
TC_H.h31 = function (event) { // click
  closeActor()
};
TC_H.h32 = function (event) { // click
  closeSettings()
};
TC_H.h33 = function (event) { // click
  clearContinueWatching()
};
TC_H.h34 = function (event) { // click
  clearFavorites()
};
TC_H.h35 = function (event) { // click
  resetPreferredServer()
};
TC_H.h36 = function (event) { // click
  clearLocalAnalytics()
};
TC_H.h37 = function (event) { // click
  cycleLiteMode()
};
TC_H.h38 = function (event) { // click
  freeStorage()
};
TC_H.h39 = function (event) { // click
  changeTextScale(-1)
};
TC_H.h40 = function (event) { // click
  changeTextScale(1)
};
TC_H.h41 = function (event) { // click
  toggleHighContrast()
};
TC_H.h42 = function (event) { // click
  toggleReduceMotion()
};
TC_H.h43 = function (event) { // click
  exportProfileData()
};
TC_H.h44 = function (event) { // click
  document.getElementById('backup-file').click()
};
TC_H.h45 = function (event) { // click
  openQrShow()
};
TC_H.h46 = function (event) { // click
  openQrScan()
};
TC_H.h47 = function (event) { // click
  openWeeklySummary()
};
TC_H.h48 = function (event) { // click
  if(event.target===this)closeProfiles()
};
TC_H.h49 = function (event) { // click
  closeProfiles()
};
TC_H.h50 = function (event) { // click
  if(event.target===this)closeProfileCreateModal()
};
TC_H.h51 = function (event) { // click
  closeProfileCreateModal()
};
TC_H.h52 = function (event) { // keydown
  if(event.key==='Enter')saveProfileFromModal()
};
TC_H.h53 = function (event) { // click
  setProfileFormKind('adult')
};
TC_H.h54 = function (event) { // click
  setProfileFormKind('kid')
};
TC_H.h55 = function (event) { // click
  setProfileFormLang('es')
};
TC_H.h56 = function (event) { // click
  setProfileFormLang('en')
};
TC_H.h57 = function (event) { // click
  markPinForRemoval()
};
TC_H.h58 = function (event) { // click
  saveProfileFromModal()
};
TC_H.h59 = function (event) { // click
  deleteProfileFromModal()
};
TC_H.h60 = function (event) { // click
  if(event.target===this)closeInstallHelp()
};
TC_H.h61 = function (event) { // click
  closeInstallHelp()
};
TC_H.h62 = function (event) { // click
  if(event.target===this)closeQr()
};
TC_H.h63 = function (event) { // click
  closeQr()
};
TC_H.h64 = function (event) { // click
  if(event.target===this)closeFavPicker()
};
TC_H.h65 = function (event) { // click
  closeFavPicker()
};
TC_H.h66 = function (event) { // keydown
  if(event.key==='Enter')submitFavNew()
};
TC_H.h67 = function (event) { // click
  submitFavNew()
};
TC_H.h68 = function (event) { // click
  if(event.target===this)closeListModal()
};
TC_H.h69 = function (event) { // click
  closeListModal()
};
TC_H.h70 = function (event) { // keydown
  if(event.key==='Enter')saveListFromModal()
};
TC_H.h71 = function (event) { // click
  saveListFromModal()
};
TC_H.h72 = function (event) { // click
  deleteListFromModal()
};
TC_H.h73 = function (event) { // click
  closeStats()
};
TC_H.h74 = function (event) { // click
  if(event.target===this)closePinModal()
};
TC_H.h75 = function (event) { // click
  closePinModal()
};
TC_H.h76 = function (event) { // keydown
  if(event.key==='Enter')submitPinModal()
};
TC_H.h77 = function (event) { // click
  submitPinModal()
};
TC_H.h78 = function (event) { // click
  closeFilters()
};
TC_H.h79 = function (event) { // click
  acceptDisclaimer()
};
