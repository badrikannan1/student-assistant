// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
// import authApiService from '../services/auth.api'; // You would create this for actual API calls

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // Example: { id, studentId, tenantId, name }
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // For initial auth check or ongoing auth operations

  // Effect to check for existing session (e.g., token in localStorage) on app load
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      let authenticatedBySession = false;

      // 1. TODO: Implement actual session checking logic (e.g., token in localStorage)
      // const token = localStorage.getItem('authToken');
      // if (token) {
      //   try {
      //     // const user = await authApiService.validateToken(token); // Validate token with backend
      //     // setCurrentUser(user);
      //     // setIsAuthenticated(true);
      //     // authenticatedBySession = true;
      //     // console.log("User authenticated from session token.");
      //   } catch (error) {
      //     console.warn("Session token validation failed:", error);
      //     localStorage.removeItem('authToken');
      //   }
      // }

      console.log("Entering authentication for embedded more");
      // 2. If not authenticated by session, check URL parameters for embedded mode
      if (!authenticatedBySession) {
        const urlParams = new URLSearchParams(window.location.search);
        const studentIdFromUrl = urlParams.get('studentId');
        const tenantIdFromUrl = urlParams.get('tenantId'); // AuthContext can also be aware of tenantId from URL

        if (studentIdFromUrl && tenantIdFromUrl) {
          // This is an embedded scenario where the portal provides user info.
          // In a real app, you might want to verify these params or fetch more user details.
          const embeddedUser = {
            id: `embed_${studentIdFromUrl}`, // Create a unique ID for embedded user
            studentId: studentIdFromUrl,
            tenantId: tenantIdFromUrl,
            name: `Embedded User (${studentIdFromUrl})`, // Placeholder name
            isEmbedded: true, // Flag to indicate this user is from an embed
          };
          setCurrentUser(embeddedUser);
          setIsAuthenticated(true);
          console.log("User authenticated from URL parameters (embedded mode).", embeddedUser);
        }
      }

      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      // In a real app, call your backend authentication service:
      // const user = await authApiService.login(credentials);
      // setCurrentUser(user);
      // setIsAuthenticated(true);
      // localStorage.setItem('authToken', user.token); // Example for token-based auth
      // return user;

      // --- Mock Login ---
      // This is a placeholder. Replace with actual authentication.
      return new Promise(resolve => {
        setTimeout(() => {
          let mockUser;
          if (credentials.username === 'joyce_student' && credentials.password === 'password123') {
            mockUser = {
              id: 'user123',
              studentId: '118829', // Specific to this mock user
              tenantId: 'joyce_uni_id', // Tenant for this mock user
              name: 'Raquel Wright',
            };
          } else if (credentials.username === 'stanford_student' && credentials.password === 'password123') {
             mockUser = {
              id: 'user456',
              studentId: 'student456', // Specific to this mock user
              tenantId: 'stanford_uni_id', // Tenant for this mock user
              name: 'Stanford Student',
            };
          } else {
            setIsLoading(false);
            throw new Error("Invalid mock credentials");
          }
          setCurrentUser(mockUser);
          setIsAuthenticated(true);
          setIsLoading(false);
          resolve(mockUser);
        }, 500);
      });
      // --- End Mock Login ---
    } catch (error) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsLoading(false);
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    // In a real app, call your backend logout service if necessary
    // await authApiService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    // localStorage.removeItem('authToken'); // Example
    setIsLoading(false);
    console.log("User logged out");
  };

  const value = {
    currentUser,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  console.log('AuthProvider: Providing value -', value, 'Children:', children != null);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
