import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Admin JWT storage — sessionStorage is cleared when the tab closes,
// which shrinks the XSS attack window vs localStorage.
// For a single-admin app that only touches a small leaderboard, this is
// an acceptable tradeoff vs the complexity of httpOnly cookies + CORS credentials.
const TOKEN_KEY = "cr-admin-token";

export function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token) {
    try {
        if (token) sessionStorage.setItem(TOKEN_KEY, token);
        else sessionStorage.removeItem(TOKEN_KEY);
    } catch { /* storage disabled */ }
}
export function clearToken() {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

function authHeaders() {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
}

// ---------- Public ----------
export const submitScore = async ({ name, score, level, character }) => {
    const { data } = await axios.post(`${API}/leaderboard`, { name, score, level, character });
    return data;
};

export const fetchLeaderboard = async (limit = 50, period = "all") => {
    const params = new URLSearchParams({ limit: String(limit), period });
    const { data } = await axios.get(`${API}/leaderboard?${params.toString()}`);
    return data;
};

export const fetchRank = async (score) => {
    const { data } = await axios.get(`${API}/leaderboard/rank?score=${score}`);
    return data;
};

// ---------- Auth ----------
export const adminLogin = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    if (data.token) setToken(data.token);
    return data;
};

export const fetchMe = async () => {
    const { data } = await axios.get(`${API}/auth/me`, { headers: authHeaders() });
    return data;
};

export const adminLogout = () => {
    clearToken();
};

// ---------- Admin leaderboard ops ----------
export const adminDeleteEntry = async (id) => {
    const { data } = await axios.delete(`${API}/leaderboard/${id}`, { headers: authHeaders() });
    return data;
};

export const adminUpdateEntry = async (id, payload) => {
    const { data } = await axios.patch(`${API}/leaderboard/${id}`, payload, { headers: authHeaders() });
    return data;
};

export const adminClearAll = async () => {
    const { data } = await axios.delete(`${API}/leaderboard`, { headers: authHeaders() });
    return data;
};
