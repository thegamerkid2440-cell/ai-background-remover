const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const initialState = document.getElementById('initialState');
const originalImage = document.getElementById('originalImage');
const resultCanvas = document.getElementById('resultCanvas');
const resultImage = document.getElementById('resultImage');
const loadingSpinner = document.getElementById('loadingSpinner');
const removeBtn = document.getElementById('removeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const errorMessage = document.getElementById('errorMessage');

let selectedFile = null;
let currentObjectUrl = null;
let processedUrl = null;

function setError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.style.display = 'none';
}

function setLoading(isLoading) {
  loadingSpinner.style.display = isLoading ? 'grid' : 'none';
  removeBtn.disabled = isLoading;
}

function resetPreviewState() {
  resultImage.style.display = 'none';
  resultCanvas.style.display = 'none';
  downloadBtn.style.display = 'none';
  clearError();
  processedUrl = null;
}

function resetAll() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  fileInput.value = '';
  selectedFile = null;
  originalImage.src = '';
  resultImage.src = '';
  resultCanvas.width = 0;
  resultCanvas.height = 0;
  previewSection.classList.add('hidden');
  initialState.classList.remove('hidden');
  resetPreviewState();
}

function handleSelectedFile(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    setError('Please choose a valid image file.');
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    setError('Image is too large. Please select a file under 25MB.');
    return;
  }

  clearError();
  selectedFile = file;

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }

  currentObjectUrl = URL.createObjectURL(file);
  originalImage.src = currentObjectUrl;

  previewSection.classList.remove('hidden');
  initialState.classList.add('hidden');
  resetPreviewState();
}

function triggerFilePicker() {
  fileInput.click();
}

uploadArea.addEventListener('click', triggerFilePicker);
fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  handleSelectedFile(file);
});

['dragenter', 'dragover'].forEach((eventName) => {
  uploadArea.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadArea.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  uploadArea.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
  });
});

uploadArea.addEventListener('drop', (event) => {
  const file = event.dataTransfer?.files?.[0];
  handleSelectedFile(file);
});

function imageToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image data.'));
    reader.readAsDataURL(blob);
  });
}

function createPngFromImageData(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not supported in this browser.');
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

async function processImage() {
  if (!selectedFile) {
    setError('Please select an image before removing the background.');
    return;
  }

  if (!window.BackgroundRemoval || !window.BackgroundRemoval.removeBackground) {
    setError('Background removal library failed to load. Please refresh the page.');
    return;
  }

  try {
    clearError();
    setLoading(true);
    resultImage.style.display = 'none';
    resultCanvas.style.display = 'none';

    const img = new Image();
    img.decoding = 'async';
    img.src = currentObjectUrl;
    await img.decode();

    const result = await window.BackgroundRemoval.removeBackground(img, {
      model: 'medium',
      output: 'image'
    });

    let outputUrl = null;

    if (result instanceof ImageData) {
      outputUrl = createPngFromImageData(result);
    } else if (typeof result === 'string') {
      outputUrl = result;
    } else if (result instanceof Blob) {
      outputUrl = await imageToDataUrl(result);
    } else if (result && typeof result === 'object' && result.canvas) {
      outputUrl = result.canvas.toDataURL('image/png');
    } else if (result && typeof result === 'object' && result.image) {
      outputUrl = result.image;
    } else {
      throw new Error('Background removal returned an unexpected result format.');
    }

    processedUrl = outputUrl;
    resultImage.src = outputUrl;
    resultImage.style.display = 'block';
    downloadBtn.style.display = 'inline-flex';
    downloadBtn.setAttribute('data-url', outputUrl);
  } catch (error) {
    console.error(error);
    setError(
      'Could not remove the background. Please try another image or a different photo. ' +
      (error?.message ? error.message : '')
    );
  } finally {
    setLoading(false);
  }
}

function downloadPng() {
  if (!processedUrl) return;

  const link = document.createElement('a');
  link.href = processedUrl;
  link.download = 'transparent-background.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

removeBtn.addEventListener('click', processImage);
downloadBtn.addEventListener('click', downloadPng);
resetBtn.addEventListener('click', resetAll);

window.addEventListener('load', () => {
  resetAll();
});
