/**
 * Login Component for POS System
 * Handles employee authentication
 */

import React, { useState, useEffect } from 'react';
import { login } from '../services/api';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-focus username input on mount
  useEffect(() => {
    document.getElementById('username-input')?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      setIsLoading(false);
      return;
    }

    try {
      const data = await login(username, password);
      
      if (data.success) {
        // Callback to parent component
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && username && password) {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              POS System Login
            </h1>
            <p className="text-gray-400">
              Enter your credentials to access the system
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-600 text-white rounded-lg">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username-input"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Username
              </label>
              <input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter your username"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password-input"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                isLoading || !username.trim() || !password.trim()
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 text-center text-sm text-gray-400">
            <p>DilmaSuperPOS</p>
            <p className="mt-1">Dubai, UAE</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;


