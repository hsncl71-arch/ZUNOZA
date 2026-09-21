/** Native layer contract. Permissions are on-demand, never at launch. */

export const NATIVE_PERMISSIONS_ON_DEMAND = [
  { id: "camera", when: "Kamera veya fotoğraf çekimi", ios: "NSCameraUsageDescription", android: "CAMERA" },
  { id: "microphone", when: "Konuş / canlı asistan / ses", ios: "NSMicrophoneUsageDescription", android: "RECORD_AUDIO" },
  { id: "photos-read", when: "Galeriden görsel veya video seçimi", ios: "NSPhotoLibraryUsageDescription", android: "READ_MEDIA_IMAGES" },
  { id: "photos-write", when: "Üretilen medyayı galeriye kaydet", ios: "NSPhotoLibraryAddUsageDescription", android: "READ_MEDIA_VIDEO" },
  { id: "notifications", when: "Video hazır bildirimi", ios: "remote-notification", android: "POST_NOTIFICATIONS" },
] as const;

export const NATIVE_FORBIDDEN_PERMISSIONS = [
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
  "READ_CONTACTS",
  "READ_SMS",
  "BLUETOOTH_CONNECT",
  "NSLocationWhenInUseUsageDescription",
  "NSContactsUsageDescription",
  "NSSpeechRecognitionUsageDescription",
] as const;

export const NATIVE_INTEGRATIONS = [
  { id: "camera", ios: true, android: true, deviceTest: true },
  { id: "microphone", ios: true, android: true, deviceTest: true },
  { id: "photo-gallery", ios: true, android: true, deviceTest: true },
  { id: "video-gallery", ios: true, android: true, deviceTest: true },
  { id: "file-picker", ios: true, android: true, deviceTest: true },
  { id: "file-upload", ios: true, android: true, deviceTest: true },
  { id: "file-download", ios: true, android: true, deviceTest: true },
  { id: "save-to-device", ios: true, android: true, deviceTest: true },
  { id: "share-sheet", ios: true, android: true, deviceTest: true },
  { id: "audio-record", ios: true, android: true, deviceTest: true },
  { id: "media-playback", ios: true, android: true, deviceTest: false },
  { id: "fullscreen-video", ios: true, android: true, deviceTest: true },
  { id: "keyboard", ios: true, android: true, deviceTest: true },
  { id: "safe-area", ios: true, android: true, deviceTest: true },
  { id: "status-bar", ios: true, android: true, deviceTest: true },
  { id: "android-back", ios: false, android: true, deviceTest: true },
  { id: "ios-swipe-back", ios: true, android: false, deviceTest: true },
  { id: "lifecycle", ios: true, android: true, deviceTest: true },
  { id: "deep-link", ios: true, android: true, deviceTest: false },
  { id: "push", ios: true, android: true, deviceTest: true },
  { id: "billing", ios: true, android: true, deviceTest: false },
] as const;
