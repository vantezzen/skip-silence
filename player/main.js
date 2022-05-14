window.SUPPORTS_SKIP_SILENCE_SHADOW_PLAYER = true;

const playSelectedFile = (file) => {
  const videoNode = document.getElementById('player');
  const fileURL = window.URL.createObjectURL(file);

  videoNode.src = fileURL;

  document.querySelector('.selection').classList.add('hidden');
  document.querySelector('#player').classList.remove('hidden');
  document.querySelector('.activate-info').classList.remove('hidden');
  document.querySelector('.drag-info').style.display = 'none';
}

// Handle selecting a new file
const inputNode = document.getElementById('input');
inputNode.addEventListener('change', (evt) => {
  playSelectedFile(evt.target.files[0]);
}, false)

// Handle Drag and Drop of files over the page
document.body.addEventListener('dragover', (ev) => {
  ev.preventDefault();
  document.querySelector('.drag-info').style.display = 'flex';
})
document.body.addEventListener('dragexit', () => {
  document.querySelector('.drag-info').style.display = 'none';
})
document.body.addEventListener('drop', (ev) => {
  console.log('File(s) dropped');

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();

        playSelectedFile(file);
        return;
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.files.length; i++) {
      playSelectedFile(ev.dataTransfer.files[i]);
      return;
    }
  }
})
