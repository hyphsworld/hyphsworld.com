import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "cr-admin-token";

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
}
export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
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

export const fetchLeaderboard = async (limit = 50) => {
    const { data } = await axios.get(`${API}/leaderboard?limit=${limit}`);
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
