import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthProvider'
import Login from './screens/Login'
import Register from './screens/Register'
import Lobby from './screens/Lobby'
import Room from './screens/Room'
import ProtectedRoute from './components/ProtectedRoute'

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/lobby" replace /> : <Navigate to="/login" replace />} 
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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