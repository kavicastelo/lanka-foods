import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authApi } from '@/api/authApi';
import { tokenStorage } from '@/api/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [appPublicSettings, setAppPublicSettings] = useState({ id: 'lankaeats-independent' });

    const checkUserAuth = useCallback(async () => {
        const token = tokenStorage.getToken();
        if (!token) {
            setUser(null);
            setIsAuthenticated(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            return;
        }

        try {
            setIsLoadingAuth(true);
            const currentUser = await authApi.getMe();
            setUser(currentUser);
            setIsAuthenticated(true);
            setAuthError(null);
        } catch (error) {
            console.error('User auth check failed:', error);
            setUser(null);
            setIsAuthenticated(false);
            tokenStorage.removeToken();
            if (error.status === 401 || error.status === 403) {
                setAuthError({
                    type: 'auth_required',
                    message: 'Session expired or authentication required',
                });
            }
        } finally {
            setIsLoadingAuth(false);
            setAuthChecked(true);
        }
    }, []);

    const checkAppState = useCallback(async () => {
        setIsLoadingPublicSettings(false);
        await checkUserAuth();
    }, [checkUserAuth]);

    useEffect(() => {
        checkAppState();

        const handleUnauthorized = () => {
            setUser(null);
            setIsAuthenticated(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
        };

        window.addEventListener('lankaeats:unauthorized', handleUnauthorized);
        return () => {
            window.removeEventListener('lankaeats:unauthorized', handleUnauthorized);
        };
    }, [checkAppState]);

    const logout = (shouldRedirect = true) => {
        authApi.logout();
        setUser(null);
        setIsAuthenticated(false);
        if (shouldRedirect) {
            window.location.href = '/login';
        }
    };

    const navigateToLogin = () => {
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            isLoadingAuth,
            isLoadingPublicSettings,
            authError,
            appPublicSettings,
            authChecked,
            logout,
            navigateToLogin,
            checkUserAuth,
            checkAppState,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
