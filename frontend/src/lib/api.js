import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const submitScore = async ({ name, score, level, character }) => {
    const { data } = await axios.post(`${API}/leaderboard`, {
        name,
        score,
        level,
        character,
    });
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
