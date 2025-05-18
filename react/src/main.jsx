import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router'
import "./css/index.css"

import Anyroute from './context/anyroute.jsx'
import Protectedroute from './context/protectedroute.jsx'
import Logoutroute from './context/logoutroute.jsx'

import { ToastProvider } from './context/toastcontext.jsx'
import { AuthProvider } from './context/authcontext.jsx'

import Home from './pages/home.jsx'
import Signup from './pages/signup.jsx'
import Login from './pages/login.jsx'
import Logout from './pages/logout.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>

          <Routes>
            <Route path="*" element={<Navigate to='/home' />} />

            <Route element={<Anyroute />}>
              <Route path="/home" element={<Home />} />
            </Route>

            <Route element={<Logoutroute />}>
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} /> 
            </Route>

            <Route element={<Protectedroute />}>
              <Route path="/logout" element={<Logout />} />
            </Route>

          </Routes>

        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
