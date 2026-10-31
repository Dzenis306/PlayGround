/* IRONBLOOM — interface rendering and front-desk UI. */
'use strict';

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function updateStartButton() {
  const btn = $('#startGame');
  if (!btn) return;
  const continuing = savedGame && savedGame.started && !savedGame.final;
  btn.innerHTML = `${continuing ? `Continue day ${savedGame.day}` : 'Start game'} <span class="btn-arrow" data-icon="arrow"></span>`;
  btn.dataset.iconDone = '0';
  hydrateIcons(btn);
}

function updateSoundButton() {
  const btn = $('#soundBtn');
  if (!btn) return;
  btn.classList.toggle('muted', !state.soundOn);
  btn.setAttribute('aria-label', state.soundOn ? 'Mute sound' : 'Turn sound on');
  btn.title = state.soundOn ? 'Mute sound' : 'Turn sound on';
}

function renderStars(container, level, size = 13) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const span = document.createElement('span');
    span.innerHTML = icon('star');
    const svg = span.firstElementChild;
    if (svg) {
      svg.style.width = `${size}px`;
      svg.style.height = `${size}px`;
      if (i < level) svg.classList.add('on');
    }
    container.appendChild(span);
  }
}

function updateUI() {
  if (!state.started) return;
  const level = starLevel(state.rep);
  const next = nextStarAt(state.rep);

  $('#dayNum').textContent = state.day;
  $('#timeNum').textContent = state.time;
  $('#cashNum').textContent = money(state.cash);
  $('#repNum').textContent = `★ ${level} / 5`;
  $('#queueCount').textContent = state.clients.length;

  // action pips
  const pips = $('#timePips');
  pips.innerHTML = '';
  const max = Math.max(state.timeMax, state.time);
  for (let i = 0; i < max; i++) {
    const pip = document.createElement('i');
    if (i < state.time) pip.classList.add('filled');
    else pip.classList.add('spent');
    pips.appendChild(pip);
  }
  pips.setAttribute('aria-label', `${state.time} of ${state.timeMax} action points left`);

  renderStars($('#starsMini'), level, 13);
  updateSoundButton();

  // care bars
  const clean = Math.round(state.cleanliness);
  const gear = Math.round(state.equipment);
  $('#cleanNum').textContent = `${clean}%`;
  $('#gearNum').textContent = `${gear}%`;
  const cleanBar = $('#cleanBar');
  const gearBar = $('#gearBar');
  cleanBar.style.width = `${clean}%`;
  gearBar.style.width = `${gear}%`;
  [cleanBar, gearBar].forEach(bar => {
    bar.classList.toggle('warn', false);
    bar.classList.toggle('bad', false);
  });
  if (clean < 40) cleanBar.classList.add('bad');
  else if (clean < 68) cleanBar.classList.add('warn');
  if (gear < 40) gearBar.classList.add('bad');
  else if (gear < 68) gearBar.classList.add('warn');
  const avgCare = (clean + gear) / 2;
  $('#careStatus').textContent = avgCare >= 86 ? 'Spotless' : avgCare >= 68 ? 'Looking good' : avgCare >= 44 ? 'Needs love' : 'Rough shape';

  // reputation notebook
  const repLabel = $('#repProgressLabel');
  const repBar = $('#repProgressBar');
  if (repLabel) repLabel.textContent = next ? `${state.rep} / ${next}` : 'MAXED';
  if (repBar) repBar.style.width = `${Math.round(starProgress(state.rep) * 100)}%`;
  const noteTip = $('#noteTip');
  if (noteTip) noteTip.textContent = noteTipText();
  const noteSessions = $('#noteSessions');
  const notePerfect = $('#notePerfect');
  const noteMood = $('#noteMood');
  if (noteSessions) noteSessions.textContent = state.trainedToday;
  if (notePerfect) notePerfect.textContent = state.dayPerfect || 0;
  if (noteMood) noteMood.textContent = state.daySatCount ? `${Math.round(state.daySatSum / state.daySatCount)}%` : '—';

  // daily goal
  const complete = state.trainedToday >= state.goalTarget;
  $('#goalReward').textContent = complete ? 'PAID' : `+$${state.goalReward}`;
  $('#goalText').textContent = complete ? 'Daily goal complete!' : `Train ${state.goalTarget} clients`;
  const goalDots = $('#goalDots');
  goalDots.innerHTML = '';
  for (let i = 0; i < state.goalTarget; i++) {
    const d = document.createElement('i');
    if (i < state.trainedToday) d.classList.add('on');
    goalDots.appendChild(d);
  }

  $('#coachAvatar').innerHTML = heroAvatarSVG(42);
  $('#coachTip').textContent = coachTipText();

  renderClients();
  updateActionButtons();
  updateCareButtons();
}

function noteTipText() {
  if (starLevel(state.rep) >= 5) return 'Five stars. The whole block knows Mia’s name. Keep the streak alive.';
  if (state.dayComplete) return 'Books are closed. Tomorrow: tighter form, earlier flyers, same big dream.';
  if (state.time <= 0) return 'Day is done. Close up, pay rent, and sleep like a champion.';
  if (state.cleanliness < 50) return 'A clean floor is the cheapest upgrade. Scrub before the next session.';
  if (state.equipment < 50) return 'That clank is a warning. A tune-up keeps clients coming back.';
  if (state.trainedToday >= state.goalTarget) return 'Goal cleared. Keep training, or close up strong and bank the bonus.';
  const tips = [
    'Strict sets build reputation fastest. Hold the window.',
    'A goal match adds 30% to the session pay. Read the card.',
    'Perfect reps make show-offs tip extra. Chase the green zone.',
    'Post a flyer when the floor is quiet. Walk-ins help pay rent.',
    'Nervous clients forgive a miss. Strict-only clients do not.'
  ];
  return tips[(state.day + state.trainedToday) % tips.length];
}

function coachTipText() {
  if (state.dayComplete) return 'Books are closed. Start the next day when you are ready.';
  if (state.time <= 0) return 'Last action spent. Close up and see how the day went.';
  if (!state.clients.length) return 'Quiet floor. Post a flyer to pull in a walk-in.';
  if (state.cleanliness < 45) return 'The floor is grimy. Clients tip less when it is messy.';
  if (state.equipment < 45) return 'That rack is wobbling. A tune-up protects your rep.';
  if (state.trainedToday === 0) return 'Pick a client. Match the focus to their goal for a 30% pay bump.';
  if (state.trainedToday < state.goalTarget) return 'Goal in sight. Strict sets pay more — if the form holds.';
  return 'Goal cleared. Keep training or close up strong.';
}

function renderClients() {
  const list = $('#clientList');
  if (!list) return;
  if (!state.clients.length) {
    list.innerHTML = `<div class="empty-queue">
      <div class="empty-icon">${icon('users')}</div>
      <b>The floor is quiet.</b>
      <span>Post a flyer to pull in a walk-in.</span>
    </div>`;
    return;
  }

  list.innerHTML = state.clients.map((client, index) => {
    const goal = GOALS[client.goal];
    const trait = TRAITS[client.trait] || TRAITS.regular;
    const disabled = state.time <= 0 || state.dayComplete;
    return `<article class="client-card" style="--card-accent:${client.palette.accent}; animation-delay:${index * 45}ms">
      <div class="client-avatar">${avatarSVG(client, 54)}</div>
      <div class="client-info">
        <div class="client-name-row"><h3>${esc(client.name)}</h3><span class="trait-chip" title="${esc(trait.blurb)}">${esc(trait.label)}</span></div>
        <div class="client-meta">
          <span class="goal-chip">${icon(goal.icon)}${esc(goal.label)}</span>
          <span class="pay-chip">$${Math.round(client.basePay)} base</span>
        </div>
      </div>
      <button class="train-btn" type="button" data-train="${client.id}" ${disabled ? 'disabled' : ''} aria-label="Train ${esc(client.name)}">Coach</button>
    </article>`;
  }).join('');
}

function updateActionButtons() {
  const disabled = state.time <= 0 || state.dayComplete;
  $$('#app [data-action]').forEach(btn => {
    const action = btn.dataset.action;
    let isDisabled = disabled;
    if (action === 'promote' && state.cash < 15) isDisabled = true;
    btn.disabled = isDisabled;
  });
  const end = $('#endDayBtn');
  if (end) end.disabled = false;
}

function updateCareButtons() {
  const promote = document.querySelector('[data-action="promote"]');
  if (promote) promote.disabled = state.time <= 0 || state.dayComplete || state.cash < 15;
}

function toast(text, type = 'info', iconName = null) {
  const stack = $('#toastStack');
  if (!stack) return;
  while (stack.children.length >= 4) stack.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ic = iconName || (type === 'cash' ? 'cash' : type === 'star' ? 'star' : type === 'warn' ? 'info' : 'check');
  el.innerHTML = `<span class="toast-icon">${icon(ic)}</span><span>${esc(text)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 220);
  }, 2850);
}

function showApp() {
  const intro = $('#intro');
  const app = $('#app');
  if (intro) intro.classList.add('hidden');
  if (app) app.classList.remove('hidden');
  document.body.classList.remove('modal-open');
  setTimeout(() => {
    if (typeof resizeScene === 'function') resizeScene();
    bgDirty = true;
  }, 30);
}

function showIntro() {
  const intro = $('#intro');
  const app = $('#app');
  if (intro) intro.classList.remove('hidden');
  if (app) app.classList.add('hidden');
  updateStartButton();
}

function openHelpModal() {
  const body = `<div class="modal-card help-modal" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
    <button class="modal-close" type="button" data-close aria-label="Close">${icon('close')}</button>
    <div class="help-head">
      <span class="modal-eyebrow">${icon('clipboard')} COACH'S NOTEBOOK</span>
      <h2 class="modal-title" id="helpTitle">How to run the place.</h2>
      <p class="modal-sub">You are Mia. You are 12. You have ten days, seven action points a day, and a very serious whistle.</p>
    </div>
    <div class="help-body">
      <div class="help-steps">
        <div class="help-step"><span class="step-badge">1</span><h3>Pick a client</h3><p>Every client has a goal. Match the focus to their goal for a <b>30% pay bump</b>.</p></div>
        <div class="help-step"><span class="step-badge">2</span><h3>Call the set</h3><p>Five reps. Hit the moving form window. <b>Strict</b> pays the most and asks the most.</p></div>
        <div class="help-step"><span class="step-badge">3</span><h3>Run the floor</h3><p>Clean, tune up, and post flyers. Then close up, pay rent, and start again.</p></div>
      </div>
      <div class="help-tips">
        <h3>House rules</h3>
        <ul>
          <li><b>Strict form wins.</b> Perfect reps build reputation. Misses cost satisfaction.</li>
          <li><b>Gym care matters.</b> A dirty or broken gym lowers pay and tips.</li>
          <li><b>Renovate early.</b> Upgrades compound. The floor upgrade adds a client every day.</li>
          <li><b>Five stars by day 10.</b> That is the whole dream. No pressure.</li>
        </ul>
        <div class="help-controls"><span><kbd>SPACE</kbd> lock in a rep</span><span><kbd>CLICK</kbd> tap the form button</span><span>Sound on/off in the top bar</span></div>
      </div>
      <div class="help-actions">
        <button class="btn btn-ink" type="button" data-close>Got it, coach</button>
        <button class="help-reset" type="button" id="resetSave">Reset progress</button>
      </div>
    </div>
  </div>`;
  openModal(body, { closable: true, type: 'help' });
  const reset = $('#resetSave');
  if (reset) {
    let armed = false;
    reset.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        reset.textContent = 'Tap again to erase your save';
        reset.classList.add('armed');
      } else {
        eraseSave();
        location.reload();
      }
    });
  }
  state.seenHelp = true;
  if (state.started) saveGame();
}

function updateIntroSaveNote() {
  // Reserved for a future continue hint; the button copy is enough for now.
}
