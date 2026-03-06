import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Creator {
    id: string;
    username: string;
    email: string;
    display_name: string | null;
}

interface AuthContextType {
    creator: Creator | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, creatorData: Creator) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [creator, setCreator] = useState<Creator | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // If we have a token on load, fetch the user's latest profile data
        const fetchMe = async () => {
            if (!token) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await api.get('/creators/me');
                setCreator(response.data);
            } catch (error) {
                console.error("Failed to fetch creator profile", error);
                logout(); // Token might be expired, clear it
            } finally {
                setIsLoading(false);
            }
        };

        void fetchMe();
    }, [token]);

    const login = (newToken: string, creatorData: Creator) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setCreator(creatorData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setCreator(null);
    };

    return (
        <AuthContext.Provider value={{ creator, token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};