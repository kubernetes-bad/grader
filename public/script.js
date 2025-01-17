const recordTitle = document.getElementById('record-title');
const fieldsContainer = document.getElementById('record-details');
const buttonContainer = document.getElementById('buttons');
const recordsLeft = document.getElementById('records-left');
const ttsCheckbox = document.getElementById('tts-checkbox');
const barCheckbox = document.getElementById('bar-checkbox');
const controlBar = document.getElementById('control-bar');
const topTapIndicator = document.getElementById('top-tap');
const bottomTapIndicator = document.getElementById('bottom-tap');

const KEY_SPEECH = '`';
const VOICE = 'Samantha';

const KEYBOARD_TO_JOYCON = {
  "1": { L: 0, R: 3 },
  "2": { L: 1, R: 2 },
  "3": { L: 3, R: 0 },
  "`": { L: 2, R: 1 },
};

// TTS
const speechSynthesis = window.speechSynthesis;
const utterance = new SpeechSynthesisUtterance();
let ttsEnabled = localStorage.getItem('ttsEnabled') === 'true';
ttsCheckbox.checked = ttsEnabled;

let barEnabled = localStorage.getItem('barEnabled') === 'true';
barCheckbox.checked = barEnabled;
controlBar.style.display = barEnabled ? 'block' : 'none';


function getVoiceByName(name) {
  const voices = speechSynthesis.getVoices();
  return voices.filter(v => v.lang === 'en-US')
    .find(v => v.name === name);
}

ttsCheckbox.addEventListener('change', (event) => {
  ttsEnabled = event.target.checked;
  localStorage.setItem('ttsEnabled', ttsEnabled);
  new SpeechSynthesisUtterance('');
  speakCurrentRecord();
});

barCheckbox.addEventListener('change', (event) => {
  barEnabled = event.target.checked;
  localStorage.setItem('barEnabled', barEnabled);
  controlBar.style.display = barEnabled ? 'block' : 'none';
})

window.currentRecord = null; // holds currently loaded record
window.config = null;
window.buttons = {};

function speakText(text) {
  speechSynthesis.cancel();
  if (!ttsEnabled) return;
  utterance.text = text;
  utterance.voice = getVoiceByName(VOICE);
  speechSynthesis.speak(utterance);
}

function speakCurrentRecord() {
  if (!window.currentRecord || ! window.config) return;
  const [_, titleLabel] = Object.entries(window.config.title).pop();
  let spokenText = `${titleLabel}: ${window.currentRecord.title}; `;
  for (const [column, label] of Object.entries(window.config.fields)) {
    if (!window.currentRecord[column]) continue;
    spokenText += `${label}: ${window.currentRecord[column]}; `;
  }

  speakText(replaceStubs(spokenText, window.currentRecord.title));
}

async function fetchConfig() {
  const config = await fetch('/config')
    .then((response) => response.json())
    .catch((error) => console.error('Error fetching config:', error));

  window.config = config;

  Object.entries(config.buttons || {})
    .map(([buttonType, { label, color, keyboardButton }, ]) => {
      const button = document.createElement('button');
      button.id = `${buttonType}-button`;
      button.textContent = label;
      if (color) button.style.backgroundColor = color;
      button.addEventListener('click', grade(buttonType));
      if (keyboardButton) window.buttons[keyboardButton] = button;
      return button;
    })
    .forEach((button) => buttonContainer.appendChild(button));
}

async function fetchRecord() {
  if (!window.config) await fetchConfig();
  fetch('/next')
    .then((response) => response.json())
    .then(({ record }) => {
      console.dir(record);
      // clear container children
      fieldsContainer.innerHTML = '';

      window.currentRecord = record;
      recordTitle.textContent = `${record.title} (${record.id})`;

      // populate fields as set in config
      Object.entries(window.config.fields)
        .map(([column, label]) => {
          // special case: image
          if (column === "image") {
            const img = document.createElement('img');
            img.src = record[column];
            img.classList = ["image-field"];
            return img;
          }

          if (!record[column]) return; // skip empty Ps
          const p = document.createElement('p');
          p.id = `record-${column}`;
          p.innerHTML = `<b>${label}:</b><br>${replaceStubs(record[column], record.title)}`;
          return p;
      })
        .filter(Boolean)
        .forEach((field) => fieldsContainer.appendChild(field));

      speakCurrentRecord();
    })
    .catch((error) => console.error(error));
  fetchProgress();
}

function grade(gradeValue) {
  return function () {
    const id = window.currentRecord.id;
    console.dir(`GRADING #${id} AS ${gradeValue}`);
    speakText(`Graded as ${gradeValue}`);
    fetch('/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, grade: gradeValue }),
    })
      .then(response => response.json())
      .then(() => fetchRecord())
      .catch(error => console.error('Error grading record:', error));
  };
}

function fetchProgress() {
  fetch('/progress')
    .then((response) => response.json())
    .then((data) => {
      const totalRecords = data.progress.total;
      const gradedRecords = data.progress.graded;
      const percentageLeft = 100 - (((totalRecords - gradedRecords) / totalRecords) * 100);

      // Display the percentage of records left
      recordsLeft.textContent = `Progress: ${percentageLeft.toFixed(2)}% (${gradedRecords}/${totalRecords})`;
    })
    .catch(error => console.error('Error fetching progress:', error));
}

// handle keyboard events
document.addEventListener('keydown', (event) => {
  if (event.key === KEY_SPEECH) {
    ttsCheckbox.click();
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  if (!window.buttons[event.key]) return;
  window.buttons[event.key].click();
  event.preventDefault();
  event.stopPropagation();
  return false; // prevent parent elements from listening to key events too
});

// Initial fetch when the page loads
fetchRecord();

// GAMEPADS
const gamepads = {};
const gamepadStates = {};

window.addEventListener("gamepadconnected", function(e) {
  const gp = navigator.getGamepads()[e.gamepad.index];
  console.log(`${gp.id} GAMEPAD CONNECTED!`);
  const mapJoyconToKeyboard = (side = 'L') => Object.keys(KEYBOARD_TO_JOYCON)
    .reduce((acc, keyboardKey) => {
      const joyconKeys = KEYBOARD_TO_JOYCON[keyboardKey];
      acc[joyconKeys[side]] = keyboardKey;
      return acc;
    }, {});
  let joyconToKeyboard = mapJoyconToKeyboard(gp.id.startsWith('Joy-Con (R') ? 'R' : 'L');

  gamepads[gp.id] = setInterval(() => {
    const gamepad = navigator.getGamepads()[e.gamepad.index];
    if (!gamepad) return;

    const buttonStates = gamepad.buttons.map((btn) => (btn.pressed || btn.touched) || false);
    const oldState = gamepadStates[e.gamepad.index] || Array(gamepad.buttons.length).fill(false);
    const changed = [];
    const haveChanges = buttonStates.some((newBtn, index) => {
      const oldBtn = oldState[index];
      const result = newBtn !== oldBtn;
      if (result) changed.push(index);
      return result;
    });
    if (!haveChanges) return;

    const pressed = [];
    gamepad.buttons.forEach((btn, index) => (btn.pressed || btn.touched) ? pressed.push(index) : null);
    // if (!pressed.length) return; // DON'T DO THIS! CAN'T GRADE THE SAME AS PREVIOUS GRADE THEN!

    changed.forEach((btnIndex) => {
      if (!gamepad.buttons[btnIndex].pressed && !gamepad.buttons[btnIndex].touched) return;
      const keyboardKey = joyconToKeyboard[btnIndex];
      if (!keyboardKey) return console.log(`UNKNOWN BUTTON: ${btnIndex}`);
      if (keyboardKey === KEY_SPEECH) return ttsCheckbox.click();
      window.buttons[keyboardKey].click();
      console.log(`PRESSED BUTTON: ${keyboardKey}`);
    });

    // SAVE NEW STATE
    gamepadStates[e.gamepad.index] = buttonStates;
  }, 50);
});

window.addEventListener("gamepaddisconnected", (e) => {
  console.log(`GAMEPAD ${e.gamepad.index} DISCONNECTED`);
  clearInterval(gamepads[e.gamepad.index]);
});

// character specific stuff

const replaceStubs = (input, charName)=> {
  const result = input
    .replaceAll('<HUMAN>', 'User')
    .replaceAll('{{user}}', 'User')
    .replaceAll('{{User}}', 'User');
  if (!charName) return result;
  return result
    .replaceAll('<BOT>', charName)
    .replaceAll('<AI>', charName)
    .replaceAll('{{char}}', charName)
    .replaceAll('{{Char}}', charName);
}

let isInsideControlBar = false;
let startX, startY;
let isSwiping = false; // To differentiate between swipes and taps

const touchHandler = {
  start: (e) => {
    if (!barEnabled) return;
    const touch = e.touches[0];
    const barRect = controlBar.getBoundingClientRect();
    isInsideControlBar = (
      touch.clientX >= barRect.left &&
      touch.clientX <= barRect.right &&
      touch.clientY >= barRect.top &&
      touch.clientY <= barRect.bottom
    );

    if (!isInsideControlBar) {
      return;
    }

    e.preventDefault();
    startX = touch.clientX / window.innerWidth;
    startY = touch.clientY / window.innerHeight;
    isSwiping = false; // Reset swipe flag on touch start
  },

  move: (e) => {
    if (!barEnabled) return;
    if (!isInsideControlBar) return;

    e.preventDefault();
    const touch = e.touches[0];
    const currentX = touch.clientX / window.innerWidth;
    const currentY = touch.clientY / window.innerHeight;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    const SWIPE_THRESHOLD = 0.24;
    if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
      isSwiping = true; // Mark as swipe if threshold is exceeded
      console.log(`Vertical swipe detected: ${deltaY > 0 ? 'down' : 'up'}`);
      handleSwipe(deltaY > 0);
    }
  },

  end: (e) => {
    if (!barEnabled) return;
    if (!isInsideControlBar) return;

    e.preventDefault();
    const touch = e.changedTouches[0];
    const currentY = touch.clientY / window.innerHeight;

    // Only check for taps if we haven't detected a swipe
    if (!isSwiping) {
      const topRect = topTapIndicator.getBoundingClientRect();
      const bottomRect = bottomTapIndicator.getBoundingClientRect();
      const tolerance = 20;

      // Check if the end position is near either tap zone
      if (Math.abs(touch.clientY - (topRect.top + topRect.height/2)) < tolerance) {
        console.log('Tap detected in top zone!');
        handleTap();
      } else if (Math.abs(touch.clientY - (bottomRect.top + bottomRect.height/2)) < tolerance) {
        console.log('Tap detected in bottom zone!');
        handleTap();
      }
    }
  }
};

function handleTap() {
  grade('good')();
}
function handleSwipe(isDown) {
  return grade(isDown ? 'skip' : 'bad')();
}

controlBar.addEventListener('touchstart', touchHandler.start, { passive: false });
controlBar.addEventListener('touchmove', touchHandler.move, { passive: false });
controlBar.addEventListener('touchend', touchHandler.end, { passive: false });
