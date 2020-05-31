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
};
let volume = 0;
// Current status of the extension:
// 0 => Not sped up
// 1 => Waiting for slowdown time to pass to speed up
// 2 => Sped up
let speedStatus = 0;

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
  canvas.fillRect(30 + config.threshold, 0, 1, canvas_element.height);

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
      updatePageInputs();
    });
  });
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
}

// Listen for messages from the page to update our config
chrome.runtime.onMessage.addListener(msg => {
  if (!msg.command) return;

  if (msg.command === 'volume') {
    volume = msg.data;
  } else if (msg.command === 'speedStatus') {
    speedStatus = msg.data;
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
  }
})
document.getElementById('slider').addEventListener('input', event => {
  config.threshold = Number(event.target.value);
  sendConfig();
})
document.getElementById('samples').addEventListener('input', event => {
  config.samples_threshold = Number(event.target.value);
  sendConfig();
})
document.getElementById('slowdown').addEventListener('input', event => {
  config.slowdown = Number(event.target.value);
  sendConfig();
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