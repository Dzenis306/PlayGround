/* IRONBLOOM — running the gym: days, care, renovations, reports. */
'use strict';

let modalConfig = null;

function modalCloseButton() {
  return `<button class="modal-close" type="button" data-close aria-label="Close">${icon('close')}</button>`;
}

function openModal(html, config = {}) {
  const root = $('#modalRoot');
  if (!root) return;
  root.innerHTML = `<div class="modal-backdrop" data-backdrop>${html}</div>`;
  modalConfig = { closable: true, ...config };
  document.body.classList.add('modal-open');
  hydrateIcons(root);
  const first = root.querySelector('button:not([disabled])');
  if (first && config.focus !== false) {
    setTimeout(() => { try { first.focus({ preventScroll: true }); } catch { /* noop */ } }, 40);
  }
}

function closeModal(force = false) {
  if (!modalConfig) return;
  if (modalConfig.closable === false && !force) return;
  const callback = modalConfig.onClose;
  modalConfig = null;
  if (typeof clearTrainingTimers === 'function') clearTrainingTimers();
  const root = $('#modalRoot');
  if (root) root.innerHTML = '';
  document.body.classList.remove('modal-open');
  if (callback) callback();
}

/* ------------------------------------------------------------
   Starting and continuing
   ------------------------------------------------------------ */
function startNewGame() {
  state = defaultState();
  state.started = true;
  state.clients = makeDayClients(3);
  state.time = state.timeMax = BASE_ACTIONS;
  state.dayComplete = false;
  clientSeq = 0;
  saveGame();
  showApp();
  updateUI();
  sfx('day');
  setTimeout(() => toast('Day 1. Doors open. Let’s build something strong.', 'star', 'dumbbell'), 220);
}

function continueGame() {
  if (!savedGame || !savedGame.started) {
    startNewGame();
    return;
  }
  state = savedGame;
  if (state.final) {
    startNewGame();
    return;
  }
  if (!state.clients.length && state.time > 0 && !state.dayComplete) {
    state.clients = makeDayClients(Math.min(3, maxClients()));
  }
  state.dayComplete = false;
  showApp();
  updateUI();
  saveGame();
  setTimeout(() => toast(`Day ${state.day}. Back to work, boss.`, 'star', 'bolt'), 220);
}

function startGame() {
  if (savedGame && savedGame.started && !savedGame.final) continueGame();
  else startNewGame();
}

function clientCount() {
  return Math.min(5, 3 + (state.upgrades.floor ? 1 : 0) + (starLevel(state.rep) >= 3 ? 1 : 0));
}

function startNextDay() {
  closeModal(true);
  if (state.day >= MAX_DAY) return;
  state.day += 1;
  state.dayComplete = false;
  state.cleanliness = clamp(state.cleanliness - (state.staff.cleaner ? 2 : 13), 0, 100);
  state.equipment = clamp(state.equipment - 8, 0, 100);
  state.timeMax = BASE_ACTIONS + (state.staff.coach ? 1 : 0);
  state.time = state.timeMax;
  state.dayEarnings = 0;
  state.dayExpenses = 0;
  state.dayRep = 0;
  state.daySatSum = 0;
  state.daySatCount = 0;
  state.trainedToday = 0;
  state.dayPerfect = 0;
  state.goalTarget = 3 + (starLevel(state.rep) >= 4 ? 1 : 0);
  state.goalReward = 25 + (starLevel(state.rep) >= 3 ? 10 : 0);
  state.clients = makeDayClients(clientCount());
  saveGame();
  updateUI();
  sfx('day');
  setTimeout(() => toast(`Day ${state.day}. Fresh chalk, fresh start.`, 'star', 'bolt'), 240);
}

/* ------------------------------------------------------------
   Reputation and care
   ------------------------------------------------------------ */
function awardRep(amount) {
  const before = starLevel(state.rep);
  state.rep += Math.max(0, Math.round(amount));
  state.dayRep += Math.max(0, Math.round(amount));
  const after = starLevel(state.rep);
  if (after > before) {
    sfx('level');
    setTimeout(() => toast(`Gym level ${after}! ${after === 5 ? 'Five stars. The block is watching.' : 'The neighborhood is talking.'}`, 'star', 'star'), 320);
    spawnBurst(590, 620, [SUN, CORAL, MINT, LILAC], 48);
    return true;
  }
  return false;
}

function cleanGym() {
  if (state.time <= 0 || state.dayComplete) return;
  state.time -= 1;
  state.cleanliness = clamp(state.cleanliness + 34, 0, 100);
  sfx('click');
  spawnFloat(246, 590, '+CLEAN', TEAL);
  updateUI();
  saveGame();
  toast('Floor scrubbed. The mirror is smug again.', 'info', 'sparkle');
}

function repairGym() {
  if (state.time <= 0 || state.dayComplete) return;
  state.time -= 1;
  state.equipment = clamp(state.equipment + 29, 0, 100);
  sfx('click');
  spawnFloat(700, 570, '+TUNED', SUN);
  updateUI();
  saveGame();
  toast('Rack tightened. No more mysterious clanks.', 'info', 'wrench');
}

function promoteGym() {
  if (state.time <= 0 || state.dayComplete) return;
  if (state.cash < 15) {
    sfx('warn');
    toast('You need $15 for flyers.', 'warn', 'info');
    return;
  }
  state.cash -= 15;
  state.time -= 1;
  const leveled = awardRep(2);
  const walkIn = addWalkIn();
  bgDirty = true;
  sfx('click');
  updateUI();
  saveGame();
  toast(walkIn ? `${walkIn.name} saw the flyer and walked in.` : 'Flyers up. Reputation +2.', 'star', 'megaphone');
  if (leveled) updateUI();
}

/* ------------------------------------------------------------
   Renovations
   ------------------------------------------------------------ */
function isUpgradeOwned(id) {
  if (id === 'coach') return state.staff.coach;
  if (id === 'cleaner') return state.staff.cleaner;
  return Boolean(state.upgrades[id]);
}

function applyUpgrade(id) {
  const up = UPGRADES.find(u => u.id === id);
  if (!up || isUpgradeOwned(id)) return false;
  if (state.cash < up.cost) {
    sfx('warn');
    toast(`You need ${money(up.cost)} for ${up.name}.`, 'warn', 'info');
    return false;
  }
  state.cash -= up.cost;
  if (id === 'coach') {
    state.staff.coach = true;
    state.timeMax += 1;
    state.time += 1;
  } else if (id === 'cleaner') {
    state.staff.cleaner = true;
    state.cleanliness = clamp(state.cleanliness + 9, 0, 100);
  } else if (id === 'floor') {
    state.upgrades.floor = true;
    if (state.clients.length < maxClients()) addWalkIn();
  } else {
    state.upgrades[id] = true;
  }
  bgDirty = true;
  sfx('buy');
  saveGame();
  updateUI();
  toast(`${up.name} installed. ${id === 'coach' || id === 'cleaner' ? 'Wages start at close-up.' : 'The floor feels different already.'}`, 'cash', 'check');
  return true;
}

function openUpgrades() {
  const level = starLevel(state.rep);
  const cards = UPGRADES.map(up => {
    const owned = isUpgradeOwned(up.id);
    const affordable = state.cash >= up.cost;
    return `<article class="upgrade-card ${owned ? 'owned' : ''}">
      <div class="upgrade-icon">${icon(up.icon)}</div>
      <div class="upgrade-copy">
        <span class="upgrade-tag">${esc(up.tag)}</span>
        <h3>${esc(up.name)}</h3>
        <p>${esc(up.desc)}</p>
      </div>
      <div class="upgrade-buy">
        <span class="upgrade-cost">${owned ? 'INSTALLED' : money(up.cost)}${owned ? '' : '<small>one-time install</small>'}</span>
        <button class="btn ${owned ? '' : 'btn-sun'}" type="button" data-buy="${up.id}" ${owned || !affordable ? 'disabled' : ''}>${owned ? 'Owned' : affordable ? 'Install' : 'Need cash'}</button>
      </div>
    </article>`;
  }).join('');

  const body = `<div class="modal-card upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="upgradeTitle">
    ${modalCloseButton()}
    <div class="upgrade-head">
      <div>
        <span class="modal-eyebrow">${icon('grow')} RENOVATE THE DREAM</span>
        <h2 class="modal-title" id="upgradeTitle">Build a better gym.</h2>
        <p class="modal-sub">Every upgrade is permanent. Staff wages come out at close-up. Spend like a 12-year-old with a spreadsheet.</p>
      </div>
      <div class="upgrade-bank"><span>BANK</span><b>${money(state.cash)}</b></div>
    </div>
    <div class="upgrade-grid">${cards}</div>
  </div>`;
  openModal(body, { closable: true, type: 'upgrades' });
  $$('#modalRoot [data-buy]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (applyUpgrade(btn.dataset.buy)) {
        setTimeout(() => openUpgrades(), 180);
      }
    });
  });
}

/* ------------------------------------------------------------
   Closing up and reports
   ------------------------------------------------------------ */
function closeUp() {
  if (state.dayComplete) return;
  const rent = 35;
  const wages = (state.staff.coach ? 25 : 0) + (state.staff.cleaner ? 15 : 0);
  const goalComplete = state.trainedToday >= state.goalTarget;
  const reward = goalComplete ? state.goalReward : 0;
  const gross = state.dayEarnings;
  const expenses = rent + wages;
  const net = gross + reward - expenses;
  const avgSat = state.daySatCount ? state.daySatSum / state.daySatCount : 0;

  state.cash += net;
  state.dayExpenses = expenses;
  state.dayComplete = true;
  state.history.push({
    day: state.day,
    gross,
    expenses,
    net,
    reward,
    rep: state.dayRep,
    clients: state.trainedToday,
    sat: Math.round(avgSat),
    cleanliness: Math.round(state.cleanliness),
    equipment: Math.round(state.equipment)
  });

  const report = {
    day: state.day,
    gross,
    expenses,
    net,
    reward,
    goalComplete,
    rep: state.dayRep,
    clients: state.trainedToday,
    sat: Math.round(avgSat),
    cleanliness: Math.round(state.cleanliness),
    equipment: Math.round(state.equipment),
    rent,
    wages,
    final: state.day >= MAX_DAY,
    stars: starLevel(state.rep),
    score: Math.round(state.cash + state.rep * 10 + starLevel(state.rep) * 500)
  };

  if (report.final) {
    state.final = true;
    saveGame();
  }
  updateUI();
  sfx('day');
  openReport(report);
}

function reportLine(report) {
  if (report.final) {
    if (report.stars >= 5) return 'Five stars. Mia taped the review to the fridge. The whole block signed it.';
    if (report.stars >= 4) return 'Four stars. The gym is loud, clean, and full of regulars. One more push next time.';
    if (report.stars >= 3) return 'Three stars. The lights stayed on and the clients kept coming. That is a real start.';
    return 'The doors stayed open. That counts. Next time, tighten the form and spend the flyers earlier.';
  }
  if (report.net >= 130) return 'A very good day. Mia counted the cash twice, then put it in the piggy bank labeled DO NOT TOUCH.';
  if (report.net >= 40) return 'The books are green. The floor is clean enough. The playlist is doing heavy lifting.';
  if (report.net >= 0) return 'Barely green. Mia stared at the receipt for a long time, then sharpened a pencil.';
  return 'Red ink. Mia has decided this is a temporary plot twist, not a personality.';
}

function openReport(report) {
  const level = report.stars;
  const next = nextStarAt(state.rep);
  const goalBlock = report.goalComplete
    ? `<div class="report-goal"><span class="goal-check">${icon('check')}</span><div><b>Daily goal complete</b><span>+${money(report.reward)} bonus added to the bank.</span></div></div>`
    : `<div class="report-goal"><span class="goal-check">${icon('target')}</span><div><b>Daily goal missed</b><span>Trained ${report.clients} of ${state.goalTarget}. No bonus this time.</span></div></div>`;

  const actions = report.final
    ? `<button class="btn btn-coral" type="button" data-restart>Run it back ${icon('refresh')}</button>
       <button class="btn btn-ghost" type="button" data-title>Back to title</button>`
    : `<button class="btn btn-coral" type="button" data-next-day>Start day ${report.day + 1} ${icon('arrow')}</button>`;

  const body = `<div class="modal-card report-modal" role="dialog" aria-modal="true" aria-labelledby="reportTitle">
    <div class="report-head">
      <span class="modal-eyebrow">${icon('clipboard')} ${report.final ? 'CAREER COMPLETE' : `DAY ${report.day} / ${MAX_DAY} · CLOSED`}</span>
      <h2 id="reportTitle">${report.final ? `Final <span>score.</span>` : `Day <span>${report.day}</span> wrapped.`}</h2>
      <p>${esc(reportLine(report))}</p>
      <div class="report-stamp"><b>${report.final ? level : report.clients}</b>${report.final ? 'STARS' : report.clients === 1 ? 'CLIENT' : 'CLIENTS'}</div>
    </div>
    <div class="report-body">
      <div class="report-money">
        <div><span>GROSS</span><b>${money(report.gross)}</b></div>
        <div><span>RENT + WAGES</span><b>−${money(report.expenses)}</b></div>
        <div class="net"><span>NET</span><b>${money(report.net)}</b></div>
      </div>
      <div class="report-details">
        <div class="report-detail"><span>CLIENTS</span><b>${report.clients}</b></div>
        <div class="report-detail"><span>REP GAINED</span><b>+${report.rep}</b></div>
        <div class="report-detail"><span>AVG MOOD</span><b>${report.sat || '—'}%</b></div>
      </div>
      ${goalBlock}
      <div class="report-stars">
        <div class="report-stars-head"><span>REPUTATION · ${level} / 5 STARS</span><b>${next ? `${state.rep} / ${next} to next star` : 'MAXED OUT'}</b></div>
        <div class="report-star-track">${Array.from({ length: 5 }, (_, i) => icon('star', i < level ? 'on' : '')).join('')}</div>
      </div>
      ${report.final ? `<div class="report-details" style="margin-top:12px"><div class="report-detail"><span>FINAL BANK</span><b>${money(state.cash)}</b></div><div class="report-detail"><span>REPUTATION</span><b>${state.rep}</b></div><div class="report-detail"><span>SCORE</span><b>${report.score}</b></div></div>` : ''}
      <div class="report-actions">${actions}</div>
    </div>
  </div>`;

  openModal(body, { closable: false, type: 'report' });
  const nextBtn = $('#modalRoot [data-next-day]');
  if (nextBtn) nextBtn.addEventListener('click', startNextDay);
  const restart = $('#modalRoot [data-restart]');
  if (restart) restart.addEventListener('click', restartCareer);
  const title = $('#modalRoot [data-title]');
  if (title) title.addEventListener('click', () => {
    closeModal(true);
    showIntro();
    updateStartButton();
  });
}

function restartCareer() {
  closeModal(true);
  eraseSave();
  state = defaultState();
  state.started = true;
  state.clients = makeDayClients(3);
  state.time = state.timeMax = BASE_ACTIONS;
  saveGame();
  showApp();
  updateUI();
  sfx('day');
  toast('New career. Same dream. Bigger lifts.', 'star', 'dumbbell');
}
