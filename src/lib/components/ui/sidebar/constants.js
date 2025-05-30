export const SIDEBAR_COOKIE_NAME = "sidebar:state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const SIDEBAR_WIDTH = "16rem";
export const SIDEBAR_WIDTH_MOBILE = "18rem";
export const SIDEBAR_WIDTH_ICON = "3rem";
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";

// API URLs:
export const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
export const API_AGENT_URL = `${API_BASE_URL}/api/agent`;
export const API_AGENT_PROMPT_URL = `${API_BASE_URL}/api/agent/prompt`;
