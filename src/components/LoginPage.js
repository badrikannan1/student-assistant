// src/components/LoginPage.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // Password not used in current mock
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // In a real app, studentId and tenantId would come from the login response
      await login({ username, password });
      // Navigation to the main app would typically happen here,
      // either by App.js re-rendering or by using react-router-dom
    } catch (err) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white">Student Assistant Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
            <input id="username" name="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g., joyce_student" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Password" />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;