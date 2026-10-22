const API_URL = 'https://script.google.com/macros/s/AKfycbw7uaKU7EnZ1-imM7ZovcnmfZ_s9RtNkpJcEr_YZFVAIl9OYXaEi5LPIPN-_Dy1aPnw/exec';
const TOKEN_KEY = 'ainulhasan_token';

const MENU = [
  { id:'dashboard', icon:'layout-dashboard', label:'Dashboard' },
  { id:'alumni',    icon:'users',            label:'Alumni' },
  { id:'calendar',  icon:'calendar-days',    label:'Kalender' },
  { id:'me',        icon:'user-circle',      label:'Profil' },
  { id:'admin',     icon:'shield-check',     label:'Admin', adminOnly:true },
];

const EVENT_POLL_MS = 60000;
const EVENT_NOTIFY_DAYS = [7, 3, 1, 0];