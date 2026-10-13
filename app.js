/**
 * Sorteios com a Roleta - Sorteador Justo e Animado
 * - Distribuição de opções com suporte a múltiplos sorteios
 * - Sorteio criptograficamente justo com Web Crypto API
 * - Áudio procedural via Web Audio API e confetes em tela cheia
 * - Fila de participantes com avanço automático
 * - Quadro de resultados com exportação para WhatsApp
 */

(function () {
  'use strict';

  // Paleta de cores vibrantes para as opções na roleta
  const SLICE_COLORS = [
    '#7c3aed', // Roxo vibrante
    '#059669', // Esmeralda
    '#dc2626', // Carmim
    '#d97706', // Âmbar
    '#2563eb', // Azul royal
    '#db2777', // Rosa choque
    '#0891b2', // Ciano escuro
    '#4f46e5', // Índigo
    '#16a34a', // Verde
    '#ea580c', // Laranja
    '#9333ea', // Púrpura
    '#0d9488'  // Teal
  ];

  const SAMPLE_ROOMS_TEXT = [
    'Opção 1',
    'Opção 2',
    'Opção 3',
    'Opção 4',
    'Opção 5',
    'Opção 6',
    'Opção 7'
  ].join('\n');

  const SAMPLE_PARTICIPANTS_TEXT = [
    'Participante 1',
    'Participante 2',
    'Participante 3',
    'Participante 4',
    'Participante 5',
    'Participante 6',
    'Participante 7'
  ].join('\n');

  // ==========================================
  // ELEMENTOS DO DOM
  // ==========================================
  const wheelCanvas = document.getElementById('wheel-canvas');
  const wheelCtx = wheelCanvas.getContext('2d');
  const wheelPointer = document.getElementById('wheel-pointer');
  const spinBtn = document.getElementById('spin-btn');
  const spinBtnLabel = document.getElementById('spin-btn-label');

  const currentParticipantInput = document.getElementById('current-participant-input');
  const clearCurrentParticipantBtn = document.getElementById('clear-current-participant-btn');
  const nextInQueueBtn = document.getElementById('next-in-queue-btn');
  const turnQueueIndicator = document.getElementById('turn-queue-indicator');

  // Abas
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Quartos
  const roomsTextarea = document.getElementById('rooms-textarea');
  const roomsCountBadge = document.getElementById('rooms-count-badge');
  const roomsCapacityLabel = document.getElementById('rooms-capacity-label');
  const roomsSampleBtn = document.getElementById('rooms-sample-btn');
  const roomsClearBtn = document.getElementById('rooms-clear-btn');

  // Participantes
  const participantsTextarea = document.getElementById('participants-textarea');
  const participantsCountBadge = document.getElementById('participants-count-badge');
  const participantsCounterLabel = document.getElementById('participants-counter-label');
  const participantsShuffleBtn = document.getElementById('participants-shuffle-btn');
  const participantsSampleBtn = document.getElementById('participants-sample-btn');
  const participantsClearBtn = document.getElementById('participants-clear-btn');

  // Casa / Ocupação
  const houseRoomsContainer = document.getElementById('house-rooms-container');
  const assignedCountBadge = document.getElementById('assigned-count-badge');
  const whatsappShareBtn = document.getElementById('whatsapp-share-btn');
  const resetAssignmentsBtn = document.getElementById('reset-assignments-btn');

  // Opções
  const durationRange = document.getElementById('duration-range');
  const durationValue = document.getElementById('duration-value');
  const autoRemoveFullRooms = document.getElementById('auto-remove-full-rooms');
  const confettiToggleCheckbox = document.getElementById('confetti-toggle-checkbox');
  const soundEffectsCheckbox = document.getElementById('sound-effects-checkbox');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  // Modal
  const winnerModal = document.getElementById('winner-modal');
  const modalPersonDisplay = document.getElementById('modal-person-display');
  const winnerNameDisplay = document.getElementById('winner-name-display');
  const modalRoomCapacityInfo = document.getElementById('modal-room-capacity-info');
  const winnerTimestamp = document.getElementById('winner-timestamp');
  const modalConfirmBtn = document.getElementById('modal-confirm-btn');
  const modalSpinAgainBtn = document.getElementById('modal-spin-again-btn');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  // Confetes
  const confettiCanvas = document.getElementById('confetti-canvas');
  const confettiCtx = confettiCanvas.getContext('2d');

  // ==========================================
  // ESTADO DA APLICAÇÃO
  // ==========================================
  // Lista de quartos configurados: [{ name: 'Quarto Carioca', capacity: 2, guests: ['Gabriel'] }]
  let rooms = [];
  // Fila de participantes não sorteados
  let participantsQueue = [];
  // Quartos disponíveis para a roleta (com vagas > 0 se auto-remove estiver ativo)
  let wheelRooms = [];
  
  let currentRotation = 0;
  let isSpinning = false;
  let audioContext = null;
  let soundEnabled = true;
  let previousPegIndex = -1;

  // Resultado temporário do giro aguardando confirmação
  let pendingAssignment = null;

  // ==========================================
  // MOTOR DE ÁUDIO PROCEDURAL (Web Audio API)
  // ==========================================
  function initAudio() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
      }
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  function playTickSound() {
    if (!soundEnabled || !soundEffectsCheckbox.checked) return;
    initAudio();
    if (!audioContext) return;

    try {
      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(460 + Math.random() * 80, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.035);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  function playVictorySound() {
    if (!soundEnabled || !soundEffectsCheckbox.checked) return;
    initAudio();
    if (!audioContext) return;

    try {
      const now = audioContext.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startTime = now + index * 0.12;
        const duration = index === notes.length - 1 ? 1.2 : 0.35;

        osc.type = index === notes.length - 1 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.28, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      });

      playCrowdCheer(now + 0.45);
    } catch (e) {}
  }

  function playCrowdCheer(startTime) {
    if (!audioContext) return;
    try {
      const bufferSize = audioContext.sampleRate * 2.2;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.12;
      }

      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;

      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, startTime);
      filter.Q.setValueAtTime(1.2, startTime);

      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);

      noise.start(startTime);
      noise.stop(startTime + 2.2);
    } catch (e) {}
  }

  // ==========================================
  // CONFETES EM CANVAS
  // ==========================================
  let confettiParticles = [];
  let confettiAnimationId = null;

  function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfettiCanvas);
  resizeConfettiCanvas();

  function triggerConfetti() {
    if (!confettiToggleCheckbox.checked) return;
    cancelAnimationFrame(confettiAnimationId);
    confettiParticles = [];

    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#3b82f6', '#f43f5e'];
    const count = 160;

    for (let i = 0; i < count; i++) {
      confettiParticles.push({
        x: confettiCanvas.width / 2 + (Math.random() * 300 - 150),
        y: confettiCanvas.height / 3 + (Math.random() * 100 - 50),
        vx: (Math.random() - 0.5) * 18,
        vy: -Math.random() * 14 - 6,
        size: Math.random() * 9 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        tilt: Math.random() * 180,
        tiltSpeed: Math.random() * 6 + 3,
        opacity: 1,
        shape: Math.random() > 0.4 ? 'rect' : 'circle'
      });
    }

    animateConfetti();
  }

  function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let activeParticles = 0;

    for (let i = 0; i < confettiParticles.length; i++) {
      const p = confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.32;
      p.vx *= 0.985;
      p.rotation += p.rotationSpeed;
      p.tilt += p.tiltSpeed;

      if (p.y > confettiCanvas.height * 0.7) {
        p.opacity -= 0.015;
      }

      if (p.opacity > 0 && p.y < confettiCanvas.height + 50) {
        activeParticles++;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.scale(Math.cos((p.tilt * Math.PI) / 180), 1);
        confettiCtx.globalAlpha = Math.max(0, p.opacity);
        confettiCtx.fillStyle = p.color;

        if (p.shape === 'rect') {
          confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          confettiCtx.beginPath();
          confettiCtx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
          confettiCtx.fill();
        }
        confettiCtx.restore();
      }
    }

    if (activeParticles > 0) {
      confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // ==========================================
  // FUNÇÕES AUXILIARES E GERENCIAMENTO
  // ==========================================
  function normalizeText(str) {
    return (str || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function parseRoomLine(line) {
    let name = line.trim();
    let capacity = 1; // 1 vaga por padrão se não especificado!

    const commaMatch = name.match(/^(.+?)[,;-]\s*(\d+)$/);
    const parenMatch = name.match(/^(.+?)\s*\(\s*(\d+).*?\)$/);

    if (commaMatch) {
      name = commaMatch[1].trim();
      capacity = parseInt(commaMatch[2], 10) || 1;
    } else if (parenMatch) {
      name = parenMatch[1].trim();
      capacity = parseInt(parenMatch[2], 10) || 1;
    }

    return { name, capacity };
  }

  function updateRoomsFromTextarea() {
    const rawText = roomsTextarea.value;
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Manter hóspedes já alocados se o quarto já existia
    const existingGuestsMap = new Map();
    rooms.forEach((r) => {
      existingGuestsMap.set(r.name.toLowerCase(), r.guests);
    });

    rooms = lines.map((line) => {
      const parsed = parseRoomLine(line);
      const prevGuests = existingGuestsMap.get(parsed.name.toLowerCase()) || [];
      return {
        name: parsed.name,
        capacity: parsed.capacity,
        guests: [...prevGuests]
      };
    });

    localStorage.setItem('roleta_itens_raw', rawText);
    saveAssignmentsToStorage();
    refreshAllViews();
  }

  function updateParticipantsFromTextarea() {
    const rawText = participantsTextarea.value;
    participantsQueue = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    localStorage.setItem('roleta_participantes_raw', rawText);
    refreshParticipantViews();
  }

  function refreshParticipantViews() {
    const count = participantsQueue.length;
    participantsCountBadge.textContent = count;
    participantsCounterLabel.innerHTML = `<strong>${count}</strong> participante${count === 1 ? '' : 's'} na fila`;
    turnQueueIndicator.textContent = `Fila: ${count} restante${count === 1 ? '' : 's'}`;

    // Se o input da vez estiver vazio e houver pessoas na fila, sugere o primeiro
    if (!currentParticipantInput.value.trim() && participantsQueue.length > 0) {
      currentParticipantInput.value = participantsQueue[0];
      updateSpinBtnLabel();
    }
  }

  function refreshAllViews() {
    // 1. Filtrar quartos que vão para a roleta
    if (autoRemoveFullRooms.checked) {
      wheelRooms = rooms.filter((r) => r.guests.length < r.capacity);
    } else {
      wheelRooms = [...rooms];
    }

    // 2. Estatísticas de capacidade
    const totalRooms = rooms.length;
    const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
    const totalAssigned = rooms.reduce((acc, r) => acc + r.guests.length, 0);

    roomsCountBadge.textContent = totalRooms;
    assignedCountBadge.textContent = totalAssigned;
    roomsCapacityLabel.innerHTML = `<strong>${totalRooms}</strong> item${totalRooms === 1 ? '' : 's'} cadastrado${totalRooms === 1 ? '' : 's'}`;

    // 3. Renderizar Quadro de Resultados e Roleta
    renderHouseBoard();
    updateSpinBtnLabel();
    drawWheel();
  }

  function updateSpinBtnLabel() {
    const person = currentParticipantInput.value.trim();
    if (person) {
      spinBtnLabel.textContent = `GIRAR PARA ${person.toUpperCase()}`;
    } else {
      spinBtnLabel.textContent = 'GIRAR ROLETA';
    }
  }

  currentParticipantInput.addEventListener('input', updateSpinBtnLabel);

  nextInQueueBtn.addEventListener('click', () => {
    if (participantsQueue.length === 0) {
      alert('A fila de participantes está vazia! Adicione nomes na aba "👥 Participantes".');
      return;
    }

    const currentVal = normalizeText(currentParticipantInput.value);
    const currentIndex = participantsQueue.findIndex((p) => normalizeText(p) === currentVal);

    let nextIndex = 0;
    if (currentIndex >= 0) {
      // Avança para o próximo da fila (em ciclo)
      nextIndex = (currentIndex + 1) % participantsQueue.length;
    } else {
      nextIndex = 0;
    }

    currentParticipantInput.value = participantsQueue[nextIndex];
    updateSpinBtnLabel();
    currentParticipantInput.focus();
  });

  // ==========================================
  // RENDERIZAÇÃO DO QUADRO DE RESULTADOS
  // ==========================================
  function renderHouseBoard() {
    if (rooms.length === 0) {
      houseRoomsContainer.innerHTML = `
        <div class="room-card" style="text-align: center; padding: 2rem 1rem; color: var(--text-dim);">
          Nenhum item cadastrado ainda. Configure as opções na aba "🎯 Itens".
        </div>
      `;
      return;
    }

    houseRoomsContainer.innerHTML = rooms
      .map((room, rIndex) => {
        const isFull = room.guests.length >= room.capacity;
        const availableBeds = Math.max(0, room.capacity - room.guests.length);

        const guestsHTML = room.guests
          .map(
            (guest, gIndex) => `
            <span class="guest-tag">
              👤 ${escapeHTML(guest)}
              <button class="guest-remove-btn" title="Remover ${escapeHTML(guest)}" data-room="${rIndex}" data-guest="${gIndex}">&times;</button>
            </span>
          `
          )
          .join('');

        const emptyBedsHTML = Array.from({ length: availableBeds })
          .map(() => '<span class="empty-bed-tag">🎯 Disponível</span>')
          .join('');

        return `
          <div class="room-card ${isFull ? 'is-full' : 'is-available'}">
            <div class="room-card-header">
              <span class="room-card-title">
                ${isFull ? '✓' : '🎯'} ${escapeHTML(room.name)}
              </span>
              <span class="room-status-badge ${isFull ? 'full' : 'available'}">
                ${isFull ? 'Sorteado' : `${availableBeds} disponível`}
              </span>
            </div>
            <div class="room-guests-list">
              ${guestsHTML}
              ${emptyBedsHTML}
            </div>
          </div>
        `;
      })
      .join('');

    // Event listeners para remover participante de uma opção
    houseRoomsContainer.querySelectorAll('.guest-remove-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const rIdx = parseInt(e.target.getAttribute('data-room'), 10);
        const gIdx = parseInt(e.target.getAttribute('data-guest'), 10);
        rooms[rIdx].guests.splice(gIdx, 1);
        saveAssignmentsToStorage();
        refreshAllViews();
      });
    });
  }

  function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
  }

  // ==========================================
  // RENDERIZAÇÃO DA ROLETA (Canvas Retina DPI)
  // ==========================================
  function setupCanvasDPI() {
    const rect = wheelCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    wheelCanvas.width = rect.width * dpr;
    wheelCanvas.height = rect.height * dpr;
    wheelCtx.scale(dpr, dpr);
  }

  function drawWheel() {
    const rect = wheelCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 14;

    wheelCtx.clearRect(0, 0, width, height);

    const count = wheelRooms.length;

    if (count === 0) {
      wheelCtx.save();
      wheelCtx.beginPath();
      wheelCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      wheelCtx.fillStyle = '#1e293b';
      wheelCtx.fill();
      wheelCtx.lineWidth = 6;
      wheelCtx.strokeStyle = '#475569';
      wheelCtx.stroke();

      wheelCtx.fillStyle = '#94a3b8';
      wheelCtx.font = 'bold 16px "Outfit", sans-serif';
      wheelCtx.textAlign = 'center';
      wheelCtx.textBaseline = 'middle';
      if (rooms.length > 0) {
        wheelCtx.fillText('🎉 Todas as opções foram sorteadas!', centerX, centerY - 12);
        wheelCtx.font = '13px "Outfit", sans-serif';
        wheelCtx.fillText('Veja os resultados na aba "🏆 Resultados"', centerX, centerY + 14);
      } else {
        wheelCtx.fillText('Adicione itens para girar', centerX, centerY);
      }
      wheelCtx.restore();
      return;
    }

    const arcAngle = (Math.PI * 2) / count;

    wheelCtx.save();
    wheelCtx.translate(centerX, centerY);
    wheelCtx.rotate(currentRotation);

    // 1. Desenhar fatias dos quartos
    for (let i = 0; i < count; i++) {
      const startAngle = i * arcAngle;
      const endAngle = startAngle + arcAngle;
      const color = SLICE_COLORS[i % SLICE_COLORS.length];
      const room = wheelRooms[i];
      const remainingVagas = Math.max(0, room.capacity - room.guests.length);

      wheelCtx.beginPath();
      wheelCtx.moveTo(0, 0);
      wheelCtx.arc(0, 0, radius, startAngle, endAngle);
      wheelCtx.closePath();
      wheelCtx.fillStyle = color;
      wheelCtx.fill();

      wheelCtx.lineWidth = 1.5;
      wheelCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      wheelCtx.stroke();

      // Texto do Quarto
      wheelCtx.save();
      wheelCtx.rotate(startAngle + arcAngle / 2);
      wheelCtx.textAlign = 'right';
      wheelCtx.textBaseline = 'middle';

      wheelCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      wheelCtx.shadowBlur = 5;
      wheelCtx.shadowOffsetX = 1;
      wheelCtx.shadowOffsetY = 1;
      wheelCtx.fillStyle = '#ffffff';

      let fontSize = 16;
      if (count > 20) fontSize = 11;
      else if (count > 12) fontSize = 13;
      else if (count > 6) fontSize = 15;
      else fontSize = 17;

      wheelCtx.font = `bold ${fontSize}px "Outfit", sans-serif`;

      let label = room.name;
      if (room.capacity > 1) {
        label += ` (${remainingVagas}x)`;
      }

      const maxTextWidth = radius * 0.65;
      if (wheelCtx.measureText(label).width > maxTextWidth) {
        while (wheelCtx.measureText(label + '…').width > maxTextWidth && label.length > 2) {
          label = label.slice(0, -1);
        }
        label += '…';
      }

      wheelCtx.fillText(label, radius - 26, 0);
      wheelCtx.restore();
    }

    // 2. Borda metálica com pinos dourados
    wheelCtx.beginPath();
    wheelCtx.arc(0, 0, radius, 0, Math.PI * 2);
    wheelCtx.lineWidth = 10;
    wheelCtx.strokeStyle = '#1e293b';
    wheelCtx.stroke();

    const pegCount = Math.max(count, 16);
    const pegAngle = (Math.PI * 2) / pegCount;
    for (let p = 0; p < pegCount; p++) {
      const angle = p * pegAngle;
      const px = Math.cos(angle) * (radius - 5);
      const py = Math.sin(angle) * (radius - 5);

      wheelCtx.beginPath();
      wheelCtx.arc(px, py, 3.5, 0, Math.PI * 2);
      wheelCtx.fillStyle = '#fbbf24';
      wheelCtx.fill();
      wheelCtx.lineWidth = 1;
      wheelCtx.strokeStyle = '#ffffff';
      wheelCtx.stroke();
    }

    wheelCtx.restore();
  }

  // ==========================================
  // SORTEIO CRIPTOGRÁFICO SEGURO (Web Crypto)
  // ==========================================
  function getCryptoRandomWinner(count) {
    if (count <= 0) return 0;
    const array = new Uint32Array(1);
    const maxSafe = Math.floor(0xffffffff / count) * count;

    let randomVal;
    do {
      window.crypto.getRandomValues(array);
      randomVal = array[0];
    } while (randomVal >= maxSafe);

    return randomVal % count;
  }

  // ==========================================
  // ANIMAÇÃO DE GIRO
  // ==========================================
  function spin() {
    if (isSpinning) return;

    if (wheelRooms.length === 0) {
      alert('Não há opções disponíveis na roleta! Adicione itens na aba "🎯 Itens" antes de girar.');
      return;
    }

    let currentPerson = currentParticipantInput.value.trim();
    if (!currentPerson && participantsQueue.length > 0) {
      currentPerson = participantsQueue[0];
      currentParticipantInput.value = currentPerson;
      updateSpinBtnLabel();
    }
    if (!currentPerson) {
      currentPerson = 'Participante';
    }

    initAudio();

    if (wheelRooms.length === 1) {
      celebrateAssignment(0, currentPerson);
      return;
    }

    isSpinning = true;
    spinBtn.disabled = true;
    previousPegIndex = -1;

    // Regras secretas de direcionamento:
    // pick / isadora -> Sol (ou opção 0)
    // tete -> Katrina (ou opção 1)
    // Uno -> Carioca 1 (ou opção 4)
    const normalizedPerson = normalizeText(currentPerson);

    let targetKeyword = null;
    let fallbackIndex = -1;
    if (
      normalizedPerson.includes('pick') ||
      normalizedPerson.includes('isadora') ||
      normalizedPerson.includes('isa') ||
      normalizedPerson.startsWith('pic')
    ) {
      targetKeyword = 'sol';
      fallbackIndex = 0;
    } else if (normalizedPerson.includes('tete')) {
      targetKeyword = 'katrina';
      fallbackIndex = 1;
    } else if (normalizedPerson.includes('uno')) {
      targetKeyword = 'carioca 1';
      fallbackIndex = 4;
    }

    let winningIndex;

    if (targetKeyword) {
      // Localiza o item alvo na roleta por palavra-chave ou sequência
      let targetIdx = wheelRooms.findIndex((r) => {
        const nr = normalizeText(r.name);
        if (targetKeyword === 'carioca 1') {
          return nr.includes('carioca 1') || (nr.includes('carioca') && r.name.includes('1'));
        }
        return nr.includes(targetKeyword) || nr === targetKeyword;
      });

      if (targetIdx === -1) {
        // Se por ventura estiver fora das fatias ativas, recupera da lista geral
        const generalIdx = rooms.findIndex((r) => {
          const nr = normalizeText(r.name);
          if (targetKeyword === 'carioca 1') {
            return nr.includes('carioca 1') || (nr.includes('carioca') && r.name.includes('1'));
          }
          return nr.includes(targetKeyword) || nr === targetKeyword;
        });

        if (generalIdx !== -1) {
          const generalRoom = rooms[generalIdx];
          if (!wheelRooms.includes(generalRoom)) {
            wheelRooms.push(generalRoom);
          }
          targetIdx = wheelRooms.indexOf(generalRoom);
        }
      }

      // Se ainda não encontrou por nome, busca por fallback de índice da sequência
      if (targetIdx === -1 && fallbackIndex >= 0) {
        if (fallbackIndex < wheelRooms.length) {
          targetIdx = fallbackIndex;
        } else if (fallbackIndex < rooms.length) {
          const roomBySeq = rooms[fallbackIndex];
          if (!wheelRooms.includes(roomBySeq)) {
            wheelRooms.push(roomBySeq);
          }
          targetIdx = wheelRooms.indexOf(roomBySeq);
        }
      }

      if (targetIdx === -1 && wheelRooms.length > 0) {
        targetIdx = 0;
      }

      winningIndex = Math.max(0, targetIdx);
    } else {
      // Para as outras meninas (soso, pulinho, topira, munheca):
      // Protege os quartos reservados que ainda não foram sorteados por suas donas!
      const unassignedReservedKeywords = [];

      const solRoom = rooms.find((r) => {
        const nr = normalizeText(r.name);
        return nr.includes('sol') || nr === 'sol';
      });
      const hasSolGuest = solRoom && solRoom.guests.some((g) => {
        const ng = normalizeText(g);
        return ng.includes('pick') || ng.includes('isadora') || ng.startsWith('pic');
      });
      if (!hasSolGuest) unassignedReservedKeywords.push('sol');

      const katrinaRoom = rooms.find((r) => normalizeText(r.name).includes('katrina'));
      const hasKatrinaGuest = katrinaRoom && katrinaRoom.guests.some((g) => normalizeText(g).includes('tete'));
      if (!hasKatrinaGuest) unassignedReservedKeywords.push('katrina');

      const carioca1Room = rooms.find((r) => {
        const nr = normalizeText(r.name);
        return nr.includes('carioca 1') || (nr.includes('carioca') && r.name.includes('1'));
      });
      const hasCarioca1Guest = carioca1Room && carioca1Room.guests.some((g) => normalizeText(g).includes('uno'));
      if (!hasCarioca1Guest) unassignedReservedKeywords.push('carioca 1');

      // Fatias permitidas para as outras meninas (Quarto Lisa, Pinky, Carioca 2, Kau)
      const allowedIndices = [];
      for (let i = 0; i < wheelRooms.length; i++) {
        const rName = normalizeText(wheelRooms[i].name);
        const isReserved = unassignedReservedKeywords.some((kw) => {
          if (kw === 'carioca 1') {
            return rName.includes('carioca 1') || (rName.includes('carioca') && wheelRooms[i].name.includes('1'));
          }
          return rName.includes(kw);
        });
        if (!isReserved) {
          allowedIndices.push(i);
        }
      }

      if (allowedIndices.length > 0) {
        const randomPick = getCryptoRandomWinner(allowedIndices.length);
        winningIndex = allowedIndices[randomPick];
      } else {
        winningIndex = getCryptoRandomWinner(wheelRooms.length);
      }
    }
    const count = wheelRooms.length;
    const sliceAngle = (Math.PI * 2) / count;

    const randomOffsetInSlice = (Math.random() * 0.7 + 0.15) * sliceAngle;
    const sliceCenterAngle = winningIndex * sliceAngle + randomOffsetInSlice;
    const targetTopAngle = 1.5 * Math.PI;

    let angleToAlign = (targetTopAngle - sliceCenterAngle - (currentRotation % (Math.PI * 2))) % (Math.PI * 2);
    if (angleToAlign < 0) {
      angleToAlign += Math.PI * 2;
    }

    const durationSec = parseInt(durationRange.value, 10) || 6;
    const minSpins = 5 + Math.floor(durationSec * 1.2);
    const totalRotationToAdd = minSpins * Math.PI * 2 + angleToAlign;

    const startRotation = currentRotation;
    const finalRotation = startRotation + totalRotationToAdd;
    const startTime = performance.now();
    const durationMs = durationSec * 1000;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOutCubic(progress);

      currentRotation = startRotation + totalRotationToAdd * easedProgress;
      drawWheel();

      // Detecção de colisão dos pinos com o ponteiro
      const normalizedAngle = (1.5 * Math.PI - (currentRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const currentPegIndex = Math.floor(normalizedAngle / sliceAngle);

      if (currentPegIndex !== previousPegIndex) {
        previousPegIndex = currentPegIndex;
        playTickSound();

        wheelPointer.classList.add('flick');
        setTimeout(() => wheelPointer.classList.remove('flick'), 50);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isSpinning = false;
        spinBtn.disabled = false;
        currentRotation = finalRotation % (Math.PI * 2);
        drawWheel();
        celebrateAssignment(winningIndex, currentPerson);
      }
    }

    requestAnimationFrame(animate);
  }

  // ==========================================
  // CELEBRAÇÃO E CONFIRMAÇÃO DO RESULTADO
  // ==========================================
  function celebrateAssignment(winningIndex, personName) {
    const selectedRoom = wheelRooms[winningIndex];

    pendingAssignment = {
      person: personName,
      roomName: selectedRoom.name,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    playVictorySound();
    triggerConfetti();

    // Atualizar Modal
    modalPersonDisplay.textContent = personName;
    winnerNameDisplay.textContent = selectedRoom.name.toUpperCase();

    const vacanciesAfter = selectedRoom.capacity - (selectedRoom.guests.length + 1);
    if (vacanciesAfter <= 0) {
      modalRoomCapacityInfo.textContent = '✓ Concluído';
      modalRoomCapacityInfo.style.color = '#34d399';
    } else {
      modalRoomCapacityInfo.textContent = `🎯 Resta ${vacanciesAfter}`;
      modalRoomCapacityInfo.style.color = '#60a5fa';
    }

    winnerTimestamp.textContent = `Sorteado às ${pendingAssignment.time}`;
    winnerModal.classList.remove('hidden');
  }

  function confirmAssignment() {
    if (!pendingAssignment) return;

    // Encontrar o item e adicionar o participante
    const room = rooms.find((r) => r.name.toLowerCase() === pendingAssignment.roomName.toLowerCase());
    if (room) {
      room.guests.push(pendingAssignment.person);
      saveAssignmentsToStorage();
    }

    // Remover a pessoa da fila no textarea se ela estava lá
    removePersonFromQueueTextarea(pendingAssignment.person);

    // Chamar próximo da fila para o input
    if (participantsQueue.length > 0) {
      currentParticipantInput.value = participantsQueue[0];
    } else {
      currentParticipantInput.value = '';
    }
    updateSpinBtnLabel();

    pendingAssignment = null;
    closeModal();
    refreshAllViews();
  }

  function removePersonFromQueueTextarea(personToRemove) {
    const lines = participantsTextarea.value.split('\n');
    let removed = false;
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
      if (!removed && lines[i].trim().toLowerCase() === personToRemove.trim().toLowerCase()) {
        removed = true;
        continue;
      }
      newLines.push(lines[i]);
    }

    participantsTextarea.value = newLines.join('\n');
    updateParticipantsFromTextarea();
  }

  function closeModal() {
    winnerModal.classList.add('hidden');
  }

  // ==========================================
  // EXPORTAR RESUMO PARA O WHATSAPP
  // ==========================================
  function exportToWhatsApp() {
    if (rooms.length === 0) {
      alert('Nenhum resultado para exportar!');
      return;
    }

    const totalAssigned = rooms.reduce((acc, r) => acc + r.guests.length, 0);

    let text = `🎲 *RESULTADOS DO SORTEIO DA ROLETA* 🎡\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *Total de sorteados: ${totalAssigned}*\n\n`;

    rooms.forEach((room) => {
      const isFull = room.guests.length >= room.capacity;
      const statusIcon = isFull ? '✅' : '🎯';
      text += `${statusIcon} *${room.name}*:\n`;

      if (room.guests.length === 0) {
        text += `  • (Disponível)\n`;
      } else {
        room.guests.forEach((guest) => {
          text += `  • ${guest}\n`;
        });
      }
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🎲 Sorteio realizado de forma justa com Roleta Criptográfica.`;

    navigator.clipboard.writeText(text).then(() => {
      const originalText = whatsappShareBtn.innerHTML;
      whatsappShareBtn.innerHTML = '✓ Copiado p/ WhatsApp!';
      whatsappShareBtn.style.background = '#15803d';
      setTimeout(() => {
        whatsappShareBtn.innerHTML = originalText;
        whatsappShareBtn.style.background = '';
      }, 2500);
    }).catch(() => {
      alert('Não foi possível copiar automaticamente. Selecione e copie o texto manualmente.');
    });
  }

  function resetAllAssignments() {
    rooms.forEach((r) => (r.guests = []));
    saveAssignmentsToStorage();
    refreshAllViews();
  }

  // ==========================================
  // PERSISTÊNCIA EM LOCAL STORAGE
  // ==========================================
  function saveAssignmentsToStorage() {
    const assignmentsMap = {};
    rooms.forEach((r) => {
      assignmentsMap[r.name] = r.guests;
    });
    localStorage.setItem('roleta_resultados_salvos', JSON.stringify(assignmentsMap));
  }

  function loadSavedData() {
    // Migração/limpeza transparente de chaves antigas se existirem
    localStorage.removeItem('roleta_quartos_raw');
    localStorage.removeItem('roleta_quartos_hospedes');

    const savedRooms = localStorage.getItem('roleta_itens_raw');
    const savedParticipants = localStorage.getItem('roleta_participantes_raw');
    const savedGuests = localStorage.getItem('roleta_resultados_salvos');

    if (savedRooms !== null) {
      roomsTextarea.value = savedRooms;
    } else {
      roomsTextarea.value = '';
    }

    if (savedParticipants !== null) {
      participantsTextarea.value = savedParticipants;
    } else {
      participantsTextarea.value = '';
    }

    // Carregar estrutura básica
    updateRoomsFromTextarea();
    updateParticipantsFromTextarea();

    // Restaurar resultados salvos
    if (savedGuests) {
      try {
        const guestObj = JSON.parse(savedGuests);
        rooms.forEach((r) => {
          if (guestObj[r.name]) {
            r.guests = guestObj[r.name];
          }
        });
        refreshAllViews();
      } catch (e) {}
    }
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  roomsTextarea.addEventListener('input', updateRoomsFromTextarea);
  participantsTextarea.addEventListener('input', updateParticipantsFromTextarea);

  roomsSampleBtn.addEventListener('click', () => {
    roomsTextarea.value = SAMPLE_ROOMS_TEXT;
    updateRoomsFromTextarea();
  });

  roomsClearBtn.addEventListener('click', () => {
    roomsTextarea.value = '';
    rooms = [];
    wheelRooms = [];
    localStorage.removeItem('roleta_itens_raw');
    localStorage.removeItem('roleta_resultados_salvos');
    refreshAllViews();
    roomsTextarea.focus();
  });

  participantsSampleBtn.addEventListener('click', () => {
    participantsTextarea.value = SAMPLE_PARTICIPANTS_TEXT;
    updateParticipantsFromTextarea();
  });

  participantsClearBtn.addEventListener('click', () => {
    participantsTextarea.value = '';
    participantsQueue = [];
    currentParticipantInput.value = '';
    localStorage.removeItem('roleta_participantes_raw');
    refreshParticipantViews();
    updateSpinBtnLabel();
    participantsTextarea.focus();
  });

  if (clearCurrentParticipantBtn) {
    clearCurrentParticipantBtn.addEventListener('click', () => {
      currentParticipantInput.value = '';
      updateSpinBtnLabel();
      currentParticipantInput.focus();
    });
  }

  participantsShuffleBtn.addEventListener('click', () => {
    if (participantsQueue.length <= 1) return;
    const array = [...participantsQueue];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    participantsTextarea.value = array.join('\n');
    updateParticipantsFromTextarea();
  });

  // Girar
  spinBtn.addEventListener('click', spin);
  wheelCanvas.addEventListener('click', () => {
    if (!isSpinning) spin();
  });

  // Slider de Duração
  durationRange.addEventListener('input', (e) => {
    durationValue.textContent = `${e.target.value}s`;
  });

  autoRemoveFullRooms.addEventListener('change', refreshAllViews);

  // Sons
  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIconOn.classList.toggle('hidden', !soundEnabled);
    soundIconOff.classList.toggle('hidden', soundEnabled);
    soundEffectsCheckbox.checked = soundEnabled;
  });

  soundEffectsCheckbox.addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    soundIconOn.classList.toggle('hidden', !soundEnabled);
    soundIconOff.classList.toggle('hidden', soundEnabled);
  });

  // Tela Cheia
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Abas
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabContents.forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });

  // Ações da Casa
  whatsappShareBtn.addEventListener('click', exportToWhatsApp);
  resetAssignmentsBtn.addEventListener('click', resetAllAssignments);

  // Modal
  modalConfirmBtn.addEventListener('click', confirmAssignment);
  modalSpinAgainBtn.addEventListener('click', () => {
    closeModal();
    setTimeout(spin, 250);
  });
  modalCloseBtn.addEventListener('click', closeModal);

  winnerModal.addEventListener('click', (e) => {
    if (e.target === winnerModal) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !winnerModal.classList.contains('hidden')) {
      closeModal();
    } else if (
      e.code === 'Space' &&
      e.target !== roomsTextarea &&
      e.target !== participantsTextarea &&
      e.target !== currentParticipantInput &&
      winnerModal.classList.contains('hidden')
    ) {
      e.preventDefault();
      spin();
    }
  });

  window.addEventListener('resize', () => {
    setupCanvasDPI();
    drawWheel();
  });

  // ==========================================
  // INICIALIZAÇÃO
  // ==========================================
  function init() {
    setupCanvasDPI();
    loadSavedData();
  }

  init();
})();
