/* IRONBLOOM — boot and input wiring. */
'use strict';

function bindEvents() {
  const start = $('#startGame');
  if (start) {
    start.addEventListener('click', () => {
      ensureAudio();
      sfx('click');
      startGame();
    });
  }

  const howTo = $('#howTo');
  if (howTo) howTo.addEventListener('click', () => {
    ensureAudio();
    sfx('click');
    openHelpModal();
  });

  const help = $('#helpBtn');
  if (help) help.addEventListener('click', () => {
    ensureAudio();
    sfx('click');
    openHelpModal();
  });

  const sound = $('#soundBtn');
  if (sound) sound.addEventListener('click', () => {
    state.soundOn = !state.soundOn;
    if (state.soundOn) {
      ensureAudio();
      sfx('click');
    }
    updateSoundButton();
    saveGame();
  });

  const upgrade = $('#upgradeBtn');
  if (upgrade) upgrade.addEventListener('click', () => {
    sfx('click');
    openUpgrades();
  });

  const end = $('#endDayBtn');
  if (end) end.addEventListener('click', () => {
    sfx('click');
    closeUp();
  });

  const app = $('#app');
  if (app) {
    app.addEventListener('click', event => {
      const train = event.target.closest('[data-train]');
      if (train && !train.disabled) {
        ensureAudio();
        sfx('click');
        openTrainingSetup(train.dataset.train);
        return;
      }
      const action = event.target.closest('[data-action]');
      if (!action || action.disabled) return;
      ensureAudio();
      switch (action.dataset.action) {
        case 'clean': cleanGym(); break;
        case 'repair': repairGym(); break;
        case 'promote': promoteGym(); break;
        default: break;
      }
    });
  }

  const root = $('#modalRoot');
  if (root) {
    root.addEventListener('click', event => {
      if (event.target.closest('[data-close]')) {
        closeModal();
        return;
      }
      if (event.target.matches('[data-backdrop]') && modalConfig && modalConfig.closable) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modalConfig && modalConfig.closable) {
      event.preventDefault();
      closeModal();
      return;
    }
    if ((event.code === 'Space' || event.code === 'Enter') && training && training.active && !training.locked) {
      event.preventDefault();
      pressHit();
    }
  });

  window.addEventListener('beforeunload', () => {
    if (state.started && !state.dayComplete) saveGame();
  });
}

function init() {
  hydrateIcons();
  savedGame = loadSave();
  if (savedGame) {
    state = savedGame;
    state.dayComplete = false;
  }
  updateStartButton();
  updateSoundButton();
  bindEvents();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { bgDirty = true; });
  }

  // A small debug handle keeps the game easy to verify in a browser.
  window.__IRONBLOOM__ = {
    get state() { return state; },
    get training() { return training; },
    startNewGame,
    continueGame,
    startGame,
    openTrainingSetup,
    openUpgrades,
    openHelpModal,
    cleanGym,
    repairGym,
    promoteGym,
    closeUp,
    startNextDay,
    applyUpgrade,
    awardRep,
    pressHit,
    calcPay,
    saveGame,
    eraseSave
  };
}

init();
