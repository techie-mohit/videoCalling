import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthProvider'
import Login from './screens/Login'
import Register from './screens/Register'
import Lobby from './screens/Lobby'
import Room from './screens/Room'
import ProtectedRoute from './components/ProtectedRoute'

const App = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/lobby" replace /> : <Navigate to="/login" replace />} 
      />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/lobby" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/lobby" replace /> : <Register />} />
      <Route 
        path="/lobby" 
        element={
          <ProtectedRoute>
            <Lobby />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/room/:roomId" 
        element={
          <ProtectedRoute>
            <Room />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

export default App