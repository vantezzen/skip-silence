/**
 * Skip Silence Browser Extension:
 * Skip silent parts in videos and audio files.
 * 
 * Popup: Manage settings and show a VU Meter to visualize what it is currently doing
 * 
 * @author vantezzen (https://github.com/vantezzen)
 * @license MIT License
 */
const canvas_element = document.getElementById('vu_meter');
const canvas = canvas_element.getContext('2d');
let config = {
  threshold: 30,
  samples_threshold: 10,
  audio_delay: 0.08,
  playback_speed: 1,
  silence_speed: 3,
  enabled: false,
  hasVideoElement: true,
  supportsSlowDownTime: true,
  isConnectedToVideoElement: false,
  timeSaved: 0,
  sessionId: 0,
};
// Interval used to estimate the time saved
let timeSavedEstimateInterval = null;
// Current volume of the media
let volume = 0;
// Current status of the extension:
// 0 => Not sped up
// 1 => Waiting for slowdown time to pass to speed up
// 2 => Sped up
let speedStatus = 0;

// Time saved across all tabs
let globalSavedTime = 0;

const calculateGlobalSavedTime = () => {
  // Calculate global time saved
  globalSavedTime = 0;
  chrome.storage.sync.get('stats', (data) => {
    if (data.stats) {
      for(let key in data.stats) {
        if (key !== config.sessionId) {
          globalSavedTime += data.stats[key];
        }
      }
    }
    updateTimeSaved();
  })
}
calculateGlobalSavedTime();

// Render VU Meter to canvas element
const renderVUMeter = () => {
  // Clear current contents
  canvas.clearRect(0, 0, canvas_element.width, canvas_element.height);

  // VU Meter color changes based on if the video is currently sped up
  if (speedStatus === 2) {
    canvas.fillStyle = '#00CC00';
  } else if (speedStatus === 1) {
    canvas.fillStyle = '#ffff00';
  } else {
    canvas.fillStyle = '#00CCFF';
  }

  // Render VU Meter bar
  canvas.fillRect(30, 0, Math.min(volume + 1, canvas_element.width - 60), canvas_element.height);

  // Render Threshold bar
  canvas.fillStyle = '#FF0000';
  canvas.fillRect(30 + config.threshold, 0, 2, canvas_element.height);

  // Loop render via animation frames
  requestAnimationFrame(renderVUMeter);
}

// Send updated config to site
const sendConfig = () => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      command: 'config',
      data: config,
    });
  });
}
// Request current config from site
const requestConfig = () => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      command: 'requestConfig',
    }, function(response) {
      config = response;

      calculateGlobalSavedTime();

      updatePageInputs();
    });
  });
}
// Update the values shown on the page next to the sliders
const updatePageValues = () => {
  document.getElementById('slidervalue').innerText = Math.round(config.threshold / 2) + '%';
  document.getElementById('samplesvalue').innerText = config.samples_threshold + ' samples';
  document.getElementById('slowdownvalue').innerText = config.slowdown + 'ms';
}
// Update the page input elements to reflect the current config
const updatePageInputs = () => {
  document.getElementById('enable').checked = config.enabled;
  document.getElementById('slider').value = config.threshold;
  document.getElementById('samples').value = config.samples_threshold;
  document.getElementById('slowdown').value = config.slowdown;
  document.getElementById('playback').value = config.playback_speed;
  document.getElementById('silence').value = config.silence_speed;

  document.getElementById('no-slowdown').style.display = config.supportsSlowDownTime ? 'none' : 'block';
  document.getElementById('no-media').style.display = config.hasVideoElement ? 'none' : 'block';
  document.getElementById('not-connected').style.display = config.isConnectedToVideoElement ? 'none' : 'block';
  updateTimeSaved();
  updatePageValues();
}

const twoDigit = (number) => {
  if (number < 10) {
    return `0${number}`;
  }
  return number;
}
const formatTime = (exactTime) => {
  let time = Math.round(exactTime);
  if (time < 60) {
    return `${time}s`;
  } else if (time < 3600) {
    return `${Math.floor(time / 60)}:${twoDigit(time % 60)}min`;
  }
  const hours = Math.floor(time / 3600);
  time = time - (hours * 3600);
  const minutes = Math.floor(time / 60);
  time = time - (minutes * 60);
  return `${hours}:${twoDigit(minutes)}:${twoDigit(time)}h`;
}
const updateTimeSaved = () => {
  document.getElementById('time-saved').innerText = formatTime(config.timeSaved);
  document.getElementById('global-time-saved').innerText = formatTime(globalSavedTime + config.timeSaved);
}

// Listen for messages from the page to update our config
chrome.runtime.onMessage.addListener(msg => {
  if (!msg.command) return;

  if (msg.command === 'volume') {
    volume = msg.data;
  } else if (msg.command === 'speedStatus') {
    speedStatus = msg.data;

    if (speedStatus === 2) {
      // Start estimating the time saved
      let baseTimeSaved = config.timeSaved;
      let speedUpStart = (+new Date());
      let speedDifference = 1 / config.playback_speed - 1 / config.silence_speed;

      timeSavedEstimateInterval = setInterval(() => {
        let totalTime = ((+new Date()) - speedUpStart) / 1000;
        let timeSaved = totalTime * speedDifference;

        config.timeSaved = baseTimeSaved + timeSaved;
        updateTimeSaved();
      }, 250);
    } else if (speedStatus === 0 && timeSavedEstimateInterval) {
      clearInterval(timeSavedEstimateInterval);
    }
  } else if (msg.command === 'update') {
    requestConfig();
  }
});

// Listen for changes on input/setting elements
document.getElementById('enable').addEventListener('click', event => {
  config.enabled = event.target.checked;
  sendConfig();

  // Update VU Meter to be empty - otherwise it will be stuck on the latest value
  if (!config.enabled) {
    volume = 0;
    isSpedUp = false;
    clearInterval(timeSavedEstimateInterval);
  }
})
document.getElementById('slider').addEventListener('input', event => {
  config.threshold = Number(event.target.value);
  sendConfig();
  updatePageValues();
})
document.getElementById('samples').addEventListener('input', event => {
  config.samples_threshold = Number(event.target.value);
  sendConfig();
  updatePageValues();
})
document.getElementById('slowdown').addEventListener('input', event => {
  config.slowdown = Number(event.target.value);
  sendConfig();
  updatePageValues();
})
document.getElementById('playback').addEventListener('input', event => {
  config.playback_speed = Number(event.target.value);
  sendConfig();
})
document.getElementById('silence').addEventListener('input', event => {
  config.silence_speed = Number(event.target.value);
  sendConfig();
})

requestConfig();

// Start VU Meter render loop
renderVUMeter();