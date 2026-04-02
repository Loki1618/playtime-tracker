import './style.css';

// Store Manager
const Store = {
  getPlayers: () => JSON.parse(localStorage.getItem('pt_players')) || [],
  savePlayers: (players) => localStorage.setItem('pt_players', JSON.stringify(players)),
  getGames: () => JSON.parse(localStorage.getItem('pt_games')) || [],
  saveGames: (games) => localStorage.setItem('pt_games', JSON.stringify(games))
};

// State
const State = {
  currentView: 'view-roster',
  players: Store.getPlayers(),
  games: Store.getGames(),
  liveGame: null // { id, startTime, matchTime, isRunning, intervalId, players: [{id, activeMatchTime, isActive, goals}] }
};

// UI Elements
const UI = {
  views: document.querySelectorAll('.view'),
  navItems: document.querySelectorAll('.nav-item'),
  headerTitle: document.getElementById('header-title'),
  headerBtn: document.getElementById('header-action-btn'),
  
  // Roster
  rosterEmpty: document.getElementById('roster-empty'),
  rosterList: document.getElementById('roster-list'),
  
  // Games
  gamesList: document.getElementById('games-list'),
  
  // Stats
  statsGames: document.getElementById('stat-games'),
  statsGoals: document.getElementById('stat-goals'),
  statsList: document.getElementById('stats-list'),
  
  // Modals
  modalBackdrop: document.getElementById('modal-backdrop'),
  modalPlayer: document.getElementById('modal-player'),
  modalSummary: document.getElementById('modal-match-summary'),
  
  // Forms
  formPlayer: document.getElementById('form-player'),
  
  // Live Game
  liveSetup: document.getElementById('live-setup'),
  liveActive: document.getElementById('live-active'),
  liveSetupRoster: document.getElementById('live-setup-roster'),
  btnStartMatch: document.getElementById('btn-start-match'),
  matchTimer: document.getElementById('match-timer'),
  activeGrid: document.getElementById('active-players-grid'),
  benchGrid: document.getElementById('bench-players-grid'),
};

// Initialize
function init() {
  renderRoster();
  renderGames();
  renderStats();
  setupEventListeners();
}

function setupEventListeners() {
  // Navigation
  UI.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-target');
      switchView(target);
    });
  });

  // Header Actions
  UI.headerBtn.addEventListener('click', () => {
    if (State.currentView === 'view-roster') {
      openPlayerModal();
    }
  });

  // Roster empty state action
  document.getElementById('btn-add-first-player').addEventListener('click', openPlayerModal);
  
  // Modals close
  document.getElementById('btn-cancel-player').addEventListener('click', closeModals);
  UI.modalBackdrop.addEventListener('click', closeModals);
  
  // Player Form Submit
  UI.formPlayer.addEventListener('submit', handlePlayerSubmit);

  // New Game
  document.getElementById('btn-new-game').addEventListener('click', startNewGameFlow);
  UI.btnStartMatch.addEventListener('click', startMatchTimer);

  // Live game controls
  document.getElementById('btn-toggle-timer').addEventListener('click', toggleMatchTimer);
  document.getElementById('btn-end-match').addEventListener('click', confirmEndMatch);

  // Match summary
  document.getElementById('btn-discard-match').addEventListener('click', () => {
    State.liveGame = null;
    closeModals();
    switchView('view-games');
  });
  document.getElementById('btn-save-match').addEventListener('click', saveMatch);
}

// Navigation Logic
function switchView(targetId) {
  // Switch tab icons
  UI.navItems.forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-target') === targetId);
  });

  // Switch content
  UI.views.forEach(view => {
    view.classList.toggle('active', view.id === targetId);
  });

  State.currentView = targetId;

  // Update Header
  UI.headerBtn.classList.add('hidden');
  if (targetId === 'view-roster') {
    UI.headerTitle.textContent = 'Team Roster';
    UI.headerBtn.classList.remove('hidden');
    UI.headerBtn.innerHTML = '<span class="material-icons-round">person_add</span>';
    renderRoster();
  } else if (targetId === 'view-games') {
    UI.headerTitle.textContent = 'Game History';
    renderGames();
    const btnNew = document.getElementById('btn-new-game');
    if (btnNew) {
      if (State.liveGame) {
        btnNew.innerHTML = '<span class="material-icons-round">play_arrow</span> Resume Match';
        btnNew.classList.remove('btn-primary');
        btnNew.classList.add('btn-success');
      } else {
        btnNew.innerHTML = '<span class="material-icons-round">sports_soccer</span> New Game';
        btnNew.classList.remove('btn-success');
        btnNew.classList.add('btn-primary');
      }
    }
  } else if (targetId === 'view-stats') {
    UI.headerTitle.textContent = 'Season Stats';
    renderStats();
  } else if (targetId === 'view-live-game') {
    UI.headerTitle.textContent = 'Live Match';
  }
}

// Modals
function openPlayerModal(playerId = null) {
  UI.formPlayer.reset();
  UI.formPlayer.removeAttribute('data-id');
  document.getElementById('modal-player-title').textContent = 'Add Player';
  
  if (playerId) {
    const p = State.players.find(x => x.id === playerId);
    if (p) {
      document.getElementById('input-player-name').value = p.name;
      document.getElementById('input-player-number').value = p.number || '';
      document.getElementById('input-player-position').value = p.position || '';
      UI.formPlayer.setAttribute('data-id', p.id);
      document.getElementById('modal-player-title').textContent = 'Edit Player';
    }
  }

  UI.modalBackdrop.classList.remove('hidden');
  UI.modalPlayer.classList.remove('hidden');
}

function closeModals() {
  UI.modalBackdrop.classList.add('hidden');
  UI.modalPlayer.classList.add('hidden');
  UI.modalSummary.classList.add('hidden');
}

// Roster Management
function handlePlayerSubmit(e) {
  e.preventDefault();
  const idValue = UI.formPlayer.getAttribute('data-id');
  const name = document.getElementById('input-player-name').value;
  const number = document.getElementById('input-player-number').value;
  const position = document.getElementById('input-player-position').value;

  if (idValue) {
    // Update
    State.players = State.players.map(p => 
      p.id === idValue ? { ...p, name, number, position } : p
    );
  } else {
    // Add
    State.players.push({
      id: Date.now().toString(),
      name,
      number,
      position
    });
  }

  Store.savePlayers(State.players);
  closeModals();
  renderRoster();
}

function renderRoster() {
  if (State.players.length === 0) {
    UI.rosterEmpty.classList.remove('hidden');
    UI.rosterList.innerHTML = '';
  } else {
    UI.rosterEmpty.classList.add('hidden');
    UI.rosterList.innerHTML = State.players.map(p => `
      <div class="list-item">
        <div class="player-info">
          <div class="player-number">${p.number || '-'}</div>
          <div class="player-details">
            <h3>${p.name}</h3>
            <span>${p.position || 'No position'}</span>
          </div>
        </div>
        <div class="player-item-actions">
          <button class="icon-btn" onclick="editPlayer('${p.id}')"><span class="material-icons-round" style="font-size:1.2rem;">edit</span></button>
          <button class="icon-btn" style="color:var(--danger-color)" onclick="deletePlayer('${p.id}')"><span class="material-icons-round" style="font-size:1.2rem;">delete</span></button>
        </div>
      </div>
    `).join('');
  }
}

window.editPlayer = (id) => openPlayerModal(id);
window.deletePlayer = (id) => {
  if (confirm('Remove player from roster?')) {
    State.players = State.players.filter(p => p.id !== id);
    Store.savePlayers(State.players);
    renderRoster();
  }
};

// -- LIVE GAME LOGIC -- //
function startNewGameFlow() {
  if (State.liveGame) {
    switchView('view-live-game');
    return;
  }

  if (State.players.length === 0) {
    alert("Please add players to your roster first!");
    switchView('view-roster');
    return;
  }
  
  switchView('view-live-game');
  UI.liveSetup.classList.remove('hidden');
  UI.liveActive.classList.add('hidden');
  
  // Render toggle list
  UI.liveSetupRoster.innerHTML = State.players.map(p => `
    <div class="setup-player-toggle" data-id="${p.id}" onclick="toggleStartingPlayer('${p.id}')">
      <div style="font-weight:500;">#${p.number || '-'} ${p.name}</div>
      <span class="material-icons-round check-icon" style="color:var(--text-secondary)">radio_button_unchecked</span>
    </div>
  `).join('');
  
  // init draft livegame
  State.liveGame = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    matchTimeSeconds: 0,
    isRunning: false,
    intervalId: null,
    players: State.players.map(p => ({
      id: p.id,
      name: p.name,
      number: p.number,
      isActive: false,  // false = bench, true = field
      secondsPlayed: 0,
      goals: 0
    }))
  };
  checkStartingLineup();
}

window.toggleStartingPlayer = (pid) => {
  const player = State.liveGame.players.find(p => p.id === pid);
  if (player) {
    player.isActive = !player.isActive;
    const el = document.querySelector(`.setup-player-toggle[data-id="${pid}"]`);
    const icon = el.querySelector('.check-icon');
    if (player.isActive) {
      el.classList.add('selected');
      icon.textContent = 'check_circle';
      icon.style.color = 'var(--success-color)';
    } else {
      el.classList.remove('selected');
      icon.textContent = 'radio_button_unchecked';
      icon.style.color = 'var(--text-secondary)';
    }
  }
  checkStartingLineup();
};

function checkStartingLineup() {
  const activeCount = State.liveGame.players.filter(p => p.isActive).length;
  UI.btnStartMatch.style.display = activeCount > 0 ? 'block' : 'none';
  UI.btnStartMatch.textContent = `Start Match (${activeCount} starting)`;
}

function startMatchTimer() {
  UI.liveSetup.classList.add('hidden');
  UI.liveActive.classList.remove('hidden');
  State.liveGame.isRunning = true;
  updateLiveUI();
  
  // Start heartbeat
  State.liveGame.intervalId = setInterval(() => {
    if (State.liveGame.isRunning) {
      State.liveGame.matchTimeSeconds++;
      State.liveGame.players.forEach(p => {
        if (p.isActive) p.secondsPlayed++;
      });
      updateTimerUI();
    }
  }, 1000);
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimerUI() {
  UI.matchTimer.textContent = formatTime(State.liveGame.matchTimeSeconds);
  // Update internal player timers every sec without re-rendering everything
  State.liveGame.players.forEach(p => {
    const timeEl = document.getElementById(`time-${p.id}`);
    if (timeEl) timeEl.textContent = formatTime(p.secondsPlayed);
  });
}

function toggleMatchTimer() {
  State.liveGame.isRunning = !State.liveGame.isRunning;
  document.getElementById('timer-icon').textContent = State.liveGame.isRunning ? 'pause' : 'play_arrow';
}

function updateLiveUI() {
  const activeList = State.liveGame.players.filter(p => p.isActive);
  const benchList = State.liveGame.players.filter(p => !p.isActive);

  const renderCard = (p, isOnField) => `
    <div class="live-player-card ${isOnField ? 'active' : ''}">
      <div style="position:absolute; top:4px; right:4px;" class="goals">${p.goals > 0 ? '⚽'+p.goals : ''}</div>
      <h4>#${p.number||''} ${p.name.split(' ')[0]}</h4>
      <div class="time" id="time-${p.id}">${formatTime(p.secondsPlayed)}</div>
      <div class="live-actions">
        <button class="btn-sub" onclick="subPlayer('${p.id}')">${isOnField ? 'Sub Out' : 'Sub In'}</button>
        ${isOnField ? `
          <button class="btn-goal" onclick="addGoal('${p.id}')">+ Goal</button>
          <button class="btn-goal" onclick="removeGoal('${p.id}')" title="Remove Goal" style="flex: 0 0 32px; background: rgba(239, 68, 68, 0.2); color: var(--danger-color); display: flex; align-items: center; justify-content: center; padding: 0;">
            <span class="material-icons-round" style="font-size: 16px;">remove</span>
          </button>
        ` : ''}
      </div>
    </div>
  `;

  UI.activeGrid.innerHTML = activeList.map(p => renderCard(p, true)).join('');
  UI.benchGrid.innerHTML = benchList.map(p => renderCard(p, false)).join('');
}

window.subPlayer = (pid) => {
  const p = State.liveGame.players.find(x => x.id === pid);
  if (p) {
    p.isActive = !p.isActive;
    updateLiveUI();
  }
};

window.addGoal = (pid) => {
  const p = State.liveGame.players.find(x => x.id === pid);
  if (p) {
    p.goals++;
    updateLiveUI();
  }
};

window.removeGoal = (pid) => {
  const p = State.liveGame.players.find(x => x.id === pid);
  if (p && p.goals > 0) {
    p.goals--;
    updateLiveUI();
  }
};

function confirmEndMatch() {
  if (confirm('Are you sure you want to end this match?')) {
    clearInterval(State.liveGame.intervalId);
    State.liveGame.isRunning = false;
    
    // Show Summary
    UI.modalBackdrop.classList.remove('hidden');
    UI.modalSummary.classList.remove('hidden');
    
    document.getElementById('match-summary-list').innerHTML = State.liveGame.players
      .sort((a,b) => b.secondsPlayed - a.secondsPlayed)
      .map(p => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.1)">
          <span>#${p.number||''} ${p.name} <span style="color:var(--success-color);font-size:0.8rem">${p.goals>0 ? `(⚽${p.goals})`:''}</span></span>
          <span style="font-family:monospace">${formatTime(p.secondsPlayed)}</span>
        </div>
      `).join('');
  }
}

function saveMatch() {
  // Save match instance
  const finalMatch = {
    id: State.liveGame.id,
    date: State.liveGame.date,
    duration: State.liveGame.matchTimeSeconds,
    stats: State.liveGame.players.map(p => ({
      id: p.id,
      secondsPlayed: p.secondsPlayed,
      goals: p.goals
    }))
  };
  
  State.games.unshift(finalMatch); // latest first
  Store.saveGames(State.games);
  
  State.liveGame = null;
  closeModals();
  switchView('view-games');
}

// -- GAMES HISTORY -- //
function renderGames() {
  if (State.games.length === 0) {
    UI.gamesList.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round mb-2" style="font-size: 48px; opacity: 0.5;">sports_soccer</span>
        <p>No games played yet.</p>
      </div>`;
    return;
  }
  
  UI.gamesList.innerHTML = State.games.map(g => {
    const d = new Date(g.date).toLocaleDateString();
    const goals = g.stats.reduce((acc,s) => acc+s.goals, 0);
    return `
      <div class="list-item">
        <div class="player-info">
          <div class="player-details">
            <h3>Match on ${d}</h3>
            <span>Total Time: ${formatTime(g.duration)} | Team Goals: ${goals}</span>
          </div>
        </div>
        <button class="icon-btn" onclick="deleteGame('${g.id}')" style="color:var(--danger-color)"><span class="material-icons-round">delete</span></button>
      </div>
    `;
  }).join('');
}

window.deleteGame = (gid) => {
  if (confirm("Delete this match record?")) {
    State.games = State.games.filter(g => g.id !== gid);
    Store.saveGames(State.games);
    renderGames();
  }
};

// -- SEASON STATS -- //
function renderStats() {
  UI.statsGames.textContent = State.games.length;
  
  const totalGoals = State.games.reduce((acc,g) => acc + g.stats.reduce((sum,s) => sum+s.goals, 0), 0);
  UI.statsGoals.textContent = totalGoals;

  // Aggregate by player
  const agg = {};
  State.players.forEach(p => {
    agg[p.id] = { name: p.name, number: p.number, seconds: 0, goals: 0 };
  });

  State.games.forEach(g => {
    g.stats.forEach(s => {
      if (agg[s.id]) {
        agg[s.id].seconds += s.secondsPlayed;
        agg[s.id].goals += s.goals;
      }
    });
  });

  const sorted = Object.values(agg).sort((a,b) => b.seconds - a.seconds);

  if (State.games.length === 0) {
    UI.statsList.innerHTML = '<p class="text-sec" style="text-align:center">Play some games to see stats!</p>';
    return;
  }

  UI.statsList.innerHTML = sorted.map(p => `
    <div class="list-item">
      <div>
        <div style="font-weight:500;">#${p.number||'-'} ${p.name}</div>
        <div style="color:var(--success-color); font-size:0.8rem; font-weight:bold;">${p.goals} Goals</div>
      </div>
      <div style="font-family:monospace; font-size:1.1rem; font-weight:600;">
        ${Math.floor(p.seconds/60)}<span style="font-size:0.8rem;font-weight:normal;color:var(--text-secondary)">m</span>
      </div>
    </div>
  `).join('');
}

init();

// Register Service Worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW Registered!', reg))
      .catch(err => console.log('SW Registration failed', err));
  });
}
