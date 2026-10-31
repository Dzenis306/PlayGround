/* IRONBLOOM — client sessions and the five-rep form mini-game. */
'use strict';

let training = null;
let trainingTimers = [];

function clearTrainingTimers() {
  trainingTimers.forEach(id => clearTimeout(id));
  trainingTimers = [];
}

function scheduleTraining(fn, ms) {
  const id = setTimeout(() => {
    trainingTimers = trainingTimers.filter(t => t !== id);
    fn();
  }, ms);
  trainingTimers.push(id);
  return id;
}

function calcPay(client, focus, intensityId, quality, perfects = 0) {
  const intensity = INTENSITIES[intensityId] || INTENSITIES.focused;
  const match = focus === client.goal;
  let pay = client.basePay * intensity.pay * (match ? 1.3 : 0.85);
  pay *= 0.35 + 0.75 * (quality / 100);
  pay *= clamp(0.82 + (state.cleanliness + state.equipment) / 500, 0.78, 1.22);
  if (state.upgrades.sound) pay *= 1.05;
  if (state.upgrades.cardio && client.goal === 'cardio') pay *= 1.15;
  if (state.upgrades.smoothie) pay += 8;
  if (client.trait === 'regular') pay *= 1.1;
  if (client.trait === 'strict' && intensityId === 'strict') pay *= 1.2;
  if (client.trait === 'showoff' && perfects >= 3) pay += 10;
  return Math.max(10, Math.round(pay));
}

function estimatePay(client, focus, intensityId) {
  const low = calcPay(client, focus, intensityId, 58, 1);
  const high = calcPay(client, focus, intensityId, 92, 4);
  return `${money(low)}–${money(high)}`;
}

function setupPayNote(client, focus, intensityId) {
  const bits = [];
  if (focus === client.goal) bits.push('goal match +30%');
  else bits.push('off-goal focus');
  if (intensityId === 'strict') bits.push('narrow window');
  if (client.trait === 'strict' && intensityId === 'strict') bits.push('strict-only bonus');
  if (client.trait === 'showoff') bits.push('perfect-rep bonus');
  return bits.join(' · ');
}

function openTrainingSetup(clientId) {
  if (state.time <= 0) {
    toast('No action points left. Close up for the day.', 'warn', 'info');
    sfx('warn');
    return;
  }
  if (state.dayComplete) return;
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;

  const setup = {
    client,
    focus: client.goal,
    intensity: client.trait === 'strict' ? 'strict' : 'focused'
  };

  const focusButtons = FOCUSES.map(f => `<button class="focus-btn ${f.id === setup.focus ? 'selected' : ''}" type="button" data-focus="${f.id}" aria-pressed="${f.id === setup.focus}">
    ${icon(f.icon)}
    <b>${esc(f.label)}</b>
    <small>${esc(f.blurb)}${f.id === client.goal ? ' <span class="match-flag">MATCH</span>' : ''}</small>
  </button>`).join('');

  const intensityButtons = Object.values(INTENSITIES).map(i => `<button class="intensity-btn ${i.id === setup.intensity ? 'selected' : ''} ${i.id === 'strict' ? 'strict' : ''}" type="button" data-intensity="${i.id}" aria-pressed="${i.id === setup.intensity}">
    <span class="intensity-radio"></span>
    <span><span class="intensity-name">${esc(i.name)}</span><span class="intensity-desc">${esc(i.desc)}</span></span>
    <span class="intensity-mult">${i.mult}</span>
  </button>`).join('');

  const trait = TRAITS[client.trait] || TRAITS.regular;
  const goal = GOALS[client.goal];
  const body = `<div class="modal-card training-setup" role="dialog" aria-modal="true" aria-labelledby="setupTitle">
    ${modalCloseButton()}
    <div class="setup-left">
      <div class="setup-avatar-wrap">
        <div class="setup-avatar-ring"></div>
        <div class="setup-avatar">${avatarSVG(client, 188)}</div>
      </div>
      <span class="modal-eyebrow">${icon('clipboard')} CLIENT SESSION</span>
      <h2 id="setupTitle">Train <em>${esc(client.name)}</em></h2>
      <div class="setup-goal">${icon(goal.icon)} ${esc(goal.label)} · ${esc(trait.label)}</div>
      <p class="setup-quote">“${esc(client.quote)}”</p>
    </div>
    <div class="setup-right">
      <span class="modal-eyebrow">SESSION PLAN</span>
      <h2 class="modal-title">Call the set.</h2>
      <p class="modal-sub">Match the focus to the client's goal. Then choose how hard you want to push. Strict form pays more — if you can hold the window.</p>

      <div class="setup-step"><span class="step-num">1</span><h3>Pick the focus</h3><span class="hint">Goal: ${esc(goal.focus)}</span></div>
      <div class="focus-grid">${focusButtons}</div>

      <div class="setup-step"><span class="step-num">2</span><h3>Set the heat</h3><span class="hint">Five reps</span></div>
      <div class="intensity-list">${intensityButtons}</div>

      <div class="pay-preview"><span>ESTIMATED PAY</span><strong id="payEstimate">${estimatePay(client, setup.focus, setup.intensity)}</strong><small id="payNote">${esc(setupPayNote(client, setup.focus, setup.intensity))}</small></div>
      <div class="setup-actions"><button class="btn btn-coral" type="button" id="startSetBtn">Start 5-rep set ${icon('arrow')}</button></div>
      <p class="setup-note">Uses 1 action point. The pay is based on form, focus match, intensity, and gym condition.</p>
    </div>
  </div>`;

  openModal(body, { closable: true, type: 'training-setup' });

  const updateSetup = () => {
    $$('#modalRoot [data-focus]').forEach(btn => {
      const on = btn.dataset.focus === setup.focus;
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    $$('#modalRoot [data-intensity]').forEach(btn => {
      const on = btn.dataset.intensity === setup.intensity;
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    const est = $('#payEstimate');
    const note = $('#payNote');
    if (est) est.textContent = estimatePay(client, setup.focus, setup.intensity);
    if (note) note.textContent = setupPayNote(client, setup.focus, setup.intensity);
    sfx('click');
  };

  $$('#modalRoot [data-focus]').forEach(btn => {
    btn.addEventListener('click', () => {
      setup.focus = btn.dataset.focus;
      updateSetup();
    });
  });
  $$('#modalRoot [data-intensity]').forEach(btn => {
    btn.addEventListener('click', () => {
      setup.intensity = btn.dataset.intensity;
      updateSetup();
    });
  });
  const start = $('#startSetBtn');
  if (start) {
    start.addEventListener('click', () => {
      sfx('click');
      beginTrainingSession(client, setup.focus, setup.intensity);
    });
  }
}

function beginTrainingSession(client, focus, intensityId) {
  if (state.time <= 0 || state.dayComplete) return;
  const intensity = INTENSITIES[intensityId];
  clearTrainingTimers();
  training = {
    client,
    focus,
    intensity: intensityId,
    rep: 0,
    results: [],
    perfects: 0,
    stamina: 100,
    active: false,
    locked: false,
    needle: 0,
    center: 0.5,
    width: clamp(intensity.width - (client.difficulty - 1) * 0.1, 0.12, 0.34),
    period: 2700 / (intensity.speed * client.difficulty),
    countdownStep: 0,
    finished: false
  };

  const body = `<div class="modal-card live-modal" role="dialog" aria-modal="true" aria-label="Training set with ${esc(client.name)}">
    <div class="live-card" id="liveCard">
      <div class="live-top">
        <div class="live-rep-count">REP <b id="repNow">1</b> / 5</div>
        <div class="live-client">
          <div class="live-client-avatar">${avatarSVG(client, 38)}</div>
          <div><b>${esc(client.name)}</b><span>${esc(GOALS[client.goal].label)} · ${esc(intensity.name)}</span></div>
        </div>
        <div class="live-quality"><span>FORM</span><b id="formValue">—</b></div>
      </div>
      <div class="live-body">
        <div class="live-call ${intensityId === 'strict' ? 'strict' : ''}" id="liveCall">Find your stance. Breathe.</div>
        <div class="meter-wrap">
          <div class="meter-track" id="meterTrack">
            <div class="meter-zone" id="meterZone" style="left:38.5%;width:23%"></div>
            <div class="meter-needle" id="meterNeedle" style="left:0%"></div>
          </div>
          <div class="meter-labels"><span>MISS</span><span>FORM WINDOW</span><span>MISS</span></div>
        </div>
        <div class="live-stamina">
          <span>STAMINA</span>
          <div class="stamina-track"><div class="stamina-fill" id="staminaFill"></div></div>
          <span id="staminaNum">100%</span>
        </div>
        <div class="live-actions"><button class="hit-btn" type="button" id="hitBtn">Lock in form <kbd>SPACE</kbd></button></div>
      </div>
      <div class="rep-dots" id="repDots"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="countdown" id="countdown"><b>READY</b></div>
    </div>
  </div>`;

  openModal(body, { closable: false, type: 'training-live' });
  const hit = $('#hitBtn');
  if (hit) hit.addEventListener('click', pressHit);
  const track = $('#meterTrack');
  if (track) track.addEventListener('click', pressHit);
  startCountdown();
}

function startCountdown() {
  if (!training) return;
  const countEl = $('#countdown');
  if (!countEl) {
    beginRep();
    return;
  }
  const words = ['READY', 'SET', 'LIFT!'];
  const step = () => {
    if (!training || !document.getElementById('countdown')) return;
    if (training.countdownStep >= words.length) {
      countEl.remove();
      beginRep();
      return;
    }
    const word = words[training.countdownStep++];
    countEl.innerHTML = `<b>${word}</b>`;
    const b = countEl.querySelector('b');
    if (b) {
      b.style.animation = 'none';
      void b.offsetWidth;
      b.style.animation = '';
    }
    sfx('click');
    scheduleTraining(step, 620);
  };
  step();
}

function beginRep() {
  if (!training || training.finished) return;
  training.active = true;
  training.locked = false;
  training.needle = 0;
  training.repStart = performance.now();
  const w = training.width;
  const center = rand(w / 2 + 0.07, 1 - w / 2 - 0.07);
  training.center = center;
  training.width = w;

  const zone = $('#meterZone');
  if (zone) {
    zone.style.left = `${(center - w / 2) * 100}%`;
    zone.style.width = `${w * 100}%`;
  }
  const needle = $('#meterNeedle');
  if (needle) needle.style.left = '0%';
  const repNow = $('#repNow');
  if (repNow) repNow.textContent = training.rep + 1;
  const call = $('#liveCall');
  if (call) {
    call.classList.toggle('strict', training.intensity === 'strict');
    call.textContent = training.intensity === 'strict' ? 'STRICT SET. HOLD THE WINDOW.' : 'HIT THE FORM WINDOW.';
  }
  const hit = $('#hitBtn');
  if (hit) {
    hit.disabled = false;
    hit.innerHTML = 'Lock in form <kbd>SPACE</kbd>';
  }
  updateRepDots();
}

function updateTrainingMeter(now) {
  if (!training || !training.active || training.finished) return;
  const elapsed = now - training.repStart;
  const cycle = (elapsed / training.period) % 2;
  const pos = cycle <= 1 ? cycle : 2 - cycle;
  training.needle = pos;
  const needle = document.getElementById('meterNeedle');
  if (needle) needle.style.left = `${pos * 100}%`;
}

function updateRepDots() {
  const dots = $('#repDots');
  if (!dots) return;
  Array.from(dots.children).forEach((el, i) => {
    el.className = '';
    if (i < training.results.length) el.classList.add(training.results[i]);
    else if (i === training.rep) el.classList.add('current');
  });
}

function pressHit() {
  if (!training || !training.active || training.locked || training.finished) return;
  training.active = false;
  training.locked = true;
  const hit = $('#hitBtn');
  if (hit) hit.disabled = true;

  const distance = Math.abs(training.needle - training.center);
  const perfectWindow = training.width * 0.16;
  const goodWindow = training.width / 2;
  let result;
  let points;
  let label;
  if (distance <= perfectWindow) {
    result = 'perfect';
    points = 100;
    label = 'PERFECT FORM';
    training.perfects += 1;
    sfx('perfect');
  } else if (distance <= goodWindow) {
    result = 'good';
    points = 64;
    label = 'GOOD REP';
    sfx('good');
  } else {
    result = 'miss';
    points = 0;
    label = 'MISSED THE WINDOW';
    sfx('miss');
  }
  training.results.push(result);
  training.stamina = clamp(training.stamina - (INTENSITIES[training.intensity].fatigue + (result === 'miss' ? 4 : 0)), 0, 100);

  const avg = Math.round(training.results.reduce((sum, r) => sum + (r === 'perfect' ? 100 : r === 'good' ? 64 : 0), 0) / training.results.length);
  const formValue = $('#formValue');
  if (formValue) formValue.textContent = `${avg}%`;
  const staminaFill = $('#staminaFill');
  if (staminaFill) {
    staminaFill.style.width = `${training.stamina}%`;
    staminaFill.style.background = training.stamina < 40 ? CORAL : training.stamina < 65 ? SUN : MINT_2;
  }
  const staminaNum = $('#staminaNum');
  if (staminaNum) staminaNum.textContent = `${Math.round(training.stamina)}%`;

  const call = $('#liveCall');
  if (call) call.textContent = label;
  updateRepDots();

  const card = $('#liveCard');
  if (card) {
    if (result === 'miss') {
      card.classList.remove('live-shake');
      void card.offsetWidth;
      card.classList.add('live-shake');
    }
    const pop = document.createElement('div');
    pop.className = `result-pop ${result === 'good' ? 'good' : result === 'miss' ? 'miss' : ''}`;
    pop.textContent = result === 'perfect' ? 'PERFECT!' : result === 'good' ? 'GOOD' : 'MISS';
    card.appendChild(pop);
    scheduleTraining(() => pop.remove(), 760);
  }

  if (navigator.vibrate) {
    try { navigator.vibrate(result === 'perfect' ? 30 : result === 'miss' ? [20, 40, 20] : 15); } catch { /* noop */ }
  }

  training.rep += 1;
  if (training.rep >= 5) {
    if (call) call.textContent = result === 'miss' ? 'Set over. Shake it out.' : 'That is the set. Beautiful work.';
    scheduleTraining(finishTraining, 920);
  } else {
    scheduleTraining(beginRep, 820);
  }
}

function sessionQuote(client, quality, intensity) {
  if (quality >= 88) {
    if (client.trait === 'showoff') return 'Okay, everyone saw that. I hope everyone saw that.';
    if (intensity === 'strict') return 'That was strict and it still felt clean. I am telling everyone.';
    return 'That was the cleanest set I have ever done. I feel taller.';
  }
  if (quality >= 62) return 'I felt that. Same time next week? I am bringing a friend.';
  if (quality >= 35) return 'Rough one. My form got away from me near the end.';
  return 'I survived. My dignity is still on the floor somewhere.';
}

function finishTraining() {
  if (!training || training.finished) return;
  training.finished = true;
  training.active = false;
  const t = training;
  clearTrainingTimers();

  const quality = Math.round(t.results.reduce((sum, r) => sum + (r === 'perfect' ? 100 : r === 'good' ? 64 : 0), 0) / t.results.length);
  const match = t.focus === t.client.goal;
  const intensity = INTENSITIES[t.intensity];
  const pay = calcPay(t.client, t.focus, t.intensity, quality, t.perfects);
  const repGain = Math.round(2 + quality / 12 + (match ? 2 : 0) + (t.intensity === 'strict' ? 2 : 0) + (quality >= 90 ? 2 : 0) + (state.upgrades.smoothie ? 1 : 0));
  let satisfaction = 40 + quality * 0.5 + (match ? 10 : 0) - (t.intensity === 'strict' ? 8 : 0);
  if (state.upgrades.recovery) satisfaction += 8;
  if (state.upgrades.sound) satisfaction += 4;
  if (state.cleanliness < 50) satisfaction -= 10;
  if (state.equipment < 50) satisfaction -= 8;
  if (t.client.trait === 'nervous') satisfaction += 5;
  if (t.client.trait === 'strict' && t.intensity === 'strict') satisfaction += 5;
  if (quality < 40) satisfaction -= 15;
  satisfaction = clamp(Math.round(satisfaction), 5, 100);

  state.time = Math.max(0, state.time - 1);
  state.cash += pay;
  state.dayEarnings += pay;
  state.trainedToday += 1;
  state.totalSessions += 1;
  state.totalPerfect += t.perfects;
  state.dayPerfect += t.perfects;
  state.daySatSum += satisfaction;
  state.daySatCount += 1;
  const leveled = awardRep(repGain);
  state.clients = state.clients.filter(c => c.id !== t.client.id);

  let walkIn = null;
  if (Math.random() < 0.24 && state.time > 0) walkIn = addWalkIn();
  saveGame();

  const stars = quality >= 82 ? 3 : quality >= 55 ? 2 : 1;
  const title = quality >= 90 ? 'Perfect <span>set.</span>' : quality >= 75 ? 'Clean <span>work.</span>' : quality >= 55 ? 'Good <span>set.</span>' : 'Rough <span>set.</span>';
  const result = {
    client: t.client,
    focus: t.focus,
    intensity: t.intensity,
    quality,
    pay,
    repGain,
    satisfaction,
    perfects: t.perfects,
    stars,
    leveled,
    walkIn,
    quote: sessionQuote(t.client, quality, t.intensity),
    title,
    match
  };
  training = null;
  updateUI();
  openResult(result);
}

function openResult(result) {
  const client = result.client;
  const matchText = result.match ? 'Goal match' : 'Off-goal focus';
  const levelNote = result.leveled ? `<div class="level-up-banner">${icon('star')} GYM LEVEL UP · ${starLevel(state.rep)} STARS</div>` : '';
  const walkInNote = result.walkIn ? `<p class="setup-note" style="margin-top:10px">${esc(result.walkIn.name)} saw the session and joined the queue.</p>` : '';

  const body = `<div class="modal-card result-modal" role="dialog" aria-modal="true" aria-labelledby="resultTitle">
    <button class="modal-close" type="button" data-close aria-label="Close">${icon('close')}</button>
    <div class="result-burst">
      <div class="result-avatar">${avatarSVG(client, 130)}</div>
      <div class="result-stars">${Array.from({ length: 5 }, (_, i) => icon('star', i < result.stars ? 'on' : '')).join('')}</div>
      <h2 class="result-title" id="resultTitle">${result.title}</h2>
      <p class="result-quote">“${esc(result.quote)}”</p>
      ${levelNote}
    </div>
    <div class="result-stats">
      <div class="result-stat cash"><span>PAY</span><b>+${money(result.pay)}</b></div>
      <div class="result-stat rep"><span>REP</span><b>+${result.repGain}</b></div>
      <div class="result-stat"><span>FORM</span><b>${result.quality}%</b></div>
    </div>
    <div class="result-foot">
      <div class="report-details" style="margin-top:0">
        <div class="report-detail"><span>FOCUS</span><b>${esc(GOALS[client.goal].focus)}</b></div>
        <div class="report-detail"><span>INTENSITY</span><b>${esc(INTENSITIES[result.intensity].name)}</b></div>
        <div class="report-detail"><span>MOOD</span><b>${result.satisfaction}%</b></div>
      </div>
      <p class="setup-note" style="margin-top:9px">${esc(matchText)} · ${result.perfects} perfect rep${result.perfects === 1 ? '' : 's'}</p>
      ${walkInNote}
      <button class="btn btn-coral" type="button" data-close style="margin-top:12px">Back to the floor ${icon('arrow')}</button>
    </div>
  </div>`;

  openModal(body, {
    closable: true,
    type: 'result',
    onClose: () => {
      updateUI();
      saveGame();
      spawnBurst(246, 610, [SUN, CORAL, MINT, LILAC], result.quality >= 75 ? 36 : 18);
      spawnFloat(246, 575, `+${money(result.pay)}`, TEAL);
      if (state.time <= 0) {
        setTimeout(() => toast('No action points left. Close up and count the day.', 'warn', 'info'), 380);
      }
    }
  });
}
