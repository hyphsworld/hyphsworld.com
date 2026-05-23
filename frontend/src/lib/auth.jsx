import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminLogin, adminLogout, fetchMe, getToken, clearToken } from "./api";

const AuthCtx = createContext({ admin: null, loading: true, login: async () => {}, logout: () => {} });

export function AuthProvider({ children }) {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!getToken()) {
            setAdmin(null);
            setLoading(false);
            return;
        }
        try {
            const me = await fetchMe();
            setAdmin(me);
        } catch {
            clearToken();
            setAdmin(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const login = async (email, password) => {
        const { user } = await adminLogin(email, password);
        setAdmin(user);
        return user;
    };

    const logout = () => {
        adminLogout();
        setAdmin(null);
    };

    return (
        <AuthCtx.Provider value={{ admin, loading, login, logout }}>
            {children}
        </AuthCtx.Provider>
    );
}

export function useAuth() {
    return useContext(AuthCtx);
}
