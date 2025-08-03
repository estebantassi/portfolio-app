import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router'
import "./css/index.css"

import Anyroute from './context/anyroute.jsx'
import Protectedroute from './context/protectedroute.jsx'
import Logoutroute from './context/logoutroute.jsx'

import { ToastProvider } from './context/toastcontext.jsx'
import { AuthProvider } from './context/authcontext.jsx'
import { CallProvider } from './context/callcontext.jsx'

import Signup from './pages/signup.jsx'
import Login from './pages/login.jsx'
import Logout from './pages/logout.jsx'
import Profile from './pages/profile.jsx'
import Messages from './pages/messages.jsx'
import Notifications from './pages/notifications.jsx'

import VerifyEmail from './pages/verifyemail.jsx'
import AccountSettings from './pages/accountsettings.jsx'
import OldEmailCheck from './pages/oldemailcheck.jsx'
import NewEmailCheck from './pages/newemailcheck.jsx'
import PasswordEmailCheck from './pages/passwordemailcheck.jsx'
import Posts from './pages/posts.jsx'


createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CallProvider>

            <Routes>
              <Route path="*" element={<Navigate to='/home' />} />

              <Route element={<Anyroute />}>
                <Route path="/home" element={<Posts overrideLink={0} />} />
                <Route path="/profile/:link" element={<Profile />} />
                <Route path="/oldemailcheck/:link" element={<OldEmailCheck />} />
                <Route path="/newemailcheck/:link" element={<NewEmailCheck />} />
                <Route path="/passwordemailcheck/:link" element={<PasswordEmailCheck />} />
                <Route path="/verifyemail/:link" element={<VerifyEmail />} />
                <Route path="/posts/:link" element={<Posts />} />
              </Route>

              <Route element={<Logoutroute />}>
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} /> 
              </Route>

              <Route element={<Protectedroute />}>
                <Route path="/messages/:link" element={<Messages />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/accountsettings" element={<AccountSettings />} />
              </Route>

            </Routes>

          </CallProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>,
)
