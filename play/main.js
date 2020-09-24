window.SUPPORTS_SKIP_SILENCE_SHADOW_PLAYER = true;

const playSelectedFile = (evt) => {
  const file = evt.target.files[0];
  const videoNode = document.getElementById('player');
  const shadowVideoNode = document.getElementById('SKIP_SILENCE_SHADOW_PLAYER');
  const fileURL = window.URL.createObjectURL(file);

  videoNode.src = fileURL;
  shadowVideoNode.src = fileURL;

  document.querySelector('.selection').classList.add('hidden');
  document.querySelector('.player').classList.remove('hidden');
  document.querySelector('.activate-info').classList.remove('hidden');
}

const inputNode = document.getElementById('input');
inputNode.addEventListener('change', playSelectedFile, false)