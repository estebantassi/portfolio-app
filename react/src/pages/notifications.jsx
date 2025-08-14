import { useEffect } from 'react'
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

      await addNotification(response.data.notifications)

      setOffset(prev => prev + 2)
    } catch (err) {
      console.log(err)
      addToast(err.response?.data?.message || "An error occurred", "red")
    }
  }

  const addNotification = async (notif, reverse=false) => {
    setNotifications(prev => reverse ? [ ...notif , ...prev] : [...prev, ...notif ])
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

      <button onClick={() => {
        GetNotifications()
      }}>Get notifications</button>
    </>
  )
}

export default Notifications