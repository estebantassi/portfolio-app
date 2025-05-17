import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Anyroute from './context/anyroute.jsx'
import { ToastProvider } from './context/toastcontext.jsx'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router'
import "./css/index.css"

import Home from './pages/home.jsx'
import Signup from './pages/signup.jsx'
import Login from './pages/login.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>

        <Routes>
          <Route path="*" element={<Navigate to='/home' />} />

          <Route element={<Anyroute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
          </Route>

        </Routes>

      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
