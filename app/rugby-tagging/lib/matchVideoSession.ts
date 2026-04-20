let currentMatchVideoFile: File | null = null;
let currentMatchVideoUrl = "";

export function setMatchVideoFile(file: File) {
  if (currentMatchVideoUrl) {
    URL.revokeObjectURL(currentMatchVideoUrl);
  }

  currentMatchVideoFile = file;
  currentMatchVideoUrl = URL.createObjectURL(file);
  return currentMatchVideoUrl;
}

export function getMatchVideoUrl() {
  if (currentMatchVideoUrl) return currentMatchVideoUrl;

  if (currentMatchVideoFile) {
    currentMatchVideoUrl = URL.createObjectURL(currentMatchVideoFile);
    return currentMatchVideoUrl;
  }

  return "";
}

export function clearMatchVideoSession() {
  if (currentMatchVideoUrl) {
    URL.revokeObjectURL(currentMatchVideoUrl);
  }

  currentMatchVideoFile = null;
  currentMatchVideoUrl = "";
}