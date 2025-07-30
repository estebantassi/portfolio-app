import { useEffect } from 'react'
import { useAuth } from '../context/authcontext'
import axios from '../api/axios'
import { useState } from 'react'
import { memo } from 'react'
import getuserprofile from '../tools/getuserprofile'
import { NavLink } from 'react-router'
import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'

const NotificationItem = memo(({ notification, notifier }) => {

  const created_at = new Date(notification.created_at)

  return (
    <div>
      {(() => {
        switch (notification.type) {
          case "follow": return (
            <>
              {notifier.avatar && notifier.id && <NavLink to={`/profile/${notifier.id}`}><img src={notifier.avatar} alt="avatar" /></NavLink>}
              {notifier.username && <h2>{notifier.username} followed you</h2>}
            </>
          )
          case "message": return (
            <>
              {notifier.avatar && notifier.id && <NavLink to={`/messages/${notifier.id}`}><img src={notifier.avatar} alt="avatar" /></NavLink>}
              {notifier.username && <h2>{notifier.username} sent you a message</h2>}
            </>
          )
          default:
            break
        }
      })()}
      <p>{created_at.toLocaleString()}</p>
    </div>
  )
})

function Notifications() {

  const { user, avatar, banner, socket } = useAuth()

  const [date, setDate] = useState(new Date())
  const [offset, setOffset] = useState(0)
  const [notifications, setNotifications] = useState([])

  const { AddToast } = useContext(ToastContext)

  useEffect(() => {
    if (!socket) return

    socket.on('notification', async (data) => {
      await addNotification(data, true)
    })

    return () => {
      socket.off('notification')
    }
  }, [socket])

  useEffect(() => {
    GetNotifications()
  }, [])

  const GetNotifications = async () => {
    try {
      const response = await axios.get(`/auth/getnotifications/?offset=${notifications.length}&date=${date}`, { withCredentials: true })

      if (response.data.notifications.length == 0) return

      for (const notification of response.data.notifications) {
        await addNotification(notification)
      }

      setOffset(prev => prev + 2)
    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
    }
  }

  const addNotification = async (notif, reverse=false) => {
    const notifier = await getuserprofile(notif.notifier_id)
    setNotifications(prev => reverse ? [{ notifier, notification: notif }, ...prev] : [...prev, { notifier, notification: notif }])
  }

  return (
    <>
      <h1>Notifications</h1>

      {notifications.map((data) => (
        <NotificationItem
          key={data.notification.id}
          notification={data.notification}
          notifier={data.notifier}
        />
      ))}

      <button onClick={() => {
        GetNotifications()
      }}>Get notifications</button>
    </>
  )
}

export default Notifications