import { useEffect, useRef } from 'react'
import { useAuth } from '../context/authcontext'
import axios from '../api/axios'
import { useState } from 'react'
import { memo } from 'react'
import { NavLink } from 'react-router'
import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'

const NotificationItem = memo(({ notification, notifiers }) => {

  const created_at = new Date(notification.created_at)

  return (
    <div>

      {notifiers.map(notifier => (
        notifier?.avatar && notifier.id && (
          <NavLink key={notifier.id} to={`/profile/${notifier.id}`}>
            <img src={notifier.avatar} alt="avatar" />
          </NavLink>
        )
      ))}

      {(() => {
        let text
        switch (notification.type) {
          case "like": 
            text = "liked your post"
            break
          case "follow":
            text = "followed you"
            break
          default:
            break
        }

        
        return (
          <>
            {notification?.total_count == 1 && <p>{notifiers[0]?.username} {text}</p>} 
            {notification?.total_count == 2 && <p>{notifiers[0]?.username} and {notifiers[1]?.username} {text}</p>}
            {notification?.total_count > 2 && <p>{notifiers[0]?.username} and {notification?.total_count - 1} others {text}</p>}
          </>
        )


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

  const { addToast } = useContext(ToastContext)

  const canLoadNotificationsRef = useRef(true)
  const [canLoadNotifications, setCanLoadNotifications] = useState(true)

  useEffect(() => {
    if (!socket) return

    socket.on('notification', async (data) => {

      setNotifications(prev =>
        prev.map(item =>
          item.notification.id === data.notification.id
            ? {
                ...item,
                notification: {
                  ...item.notification,
                  total_count: item.notification.total_count + 1,
                  notifier_ids: [...item.notification.notifier_ids, data.notifier.id]
                },
                notifiers: [...item.notifiers, data.notifier]
              }
            : item
        ).concat(
          prev.every(item => item.notification.id !== data.notification.id)
            ? [{
                notification: { ...data.notification, notifier_ids: [data.notifier.id], total_count: 1 },
                notifiers: [data.notifier]
              }]
            : []
        )
      )
    })

    return () => {
      socket.off('notification')
    }
  }, [socket])

  useEffect(() => {
    GetNotifications()
  }, [])

  const GetNotifications = async () => {
    if (!canLoadNotificationsRef.current) return
    canLoadNotificationsRef.current = false
    setCanLoadNotifications(false)

    try {
      const response = await axios.get(`/auth/getnotifications/?offset=${notifications.length}&date=${date}`, { withCredentials: true })

      if (response.data.end) return

      setNotifications(prev => [...prev, ...response.data.notifications ])

      setOffset(prev => prev + 2)
    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
    }

    canLoadNotificationsRef.current = true
    setCanLoadNotifications(true)
  }

  return (
    <>
      <h1>Notifications</h1>

      {notifications.map((data) => (
        <NotificationItem
          key={data.notification.id}
          notification={data.notification}
          notifiers={data.notifiers}
        />
      ))}

      <button disabled={canLoadNotifications} onClick={() => {
        GetNotifications()
      }}>Get notifications</button>
    </>
  )
}

export default Notifications