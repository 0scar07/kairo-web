// La web solo habla con el backend de Kairo: nunca con Riot ni con ninguna key
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");

export const APK_URL = import.meta.env.VITE_APK_URL || "https://github.com/0scar07/Kairo/releases/latest/download/Kairo.apk";

export const GITHUB_URL = "https://github.com/0scar07/Kairo";
export const PRIVACY_URL = "https://0scar07.github.io/Kairo/privacy.html";
