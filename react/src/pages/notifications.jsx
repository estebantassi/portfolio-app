import { useEffect, useRef } from 'react'
import { useAuth } from '../context/authcontext'
import axios from '../api/axios'
import { useState } from 'react'
import { memo } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import "../css/notifications.css"

const NotificationItem = memo(({ navigate, notification, notifiers }) => {

  const created_at = new Date(notification.created_at)

  return (
    <div className={notification.type != "follow" ? 'clickable' : ""} onClick={() => {
      if (window.getSelection() && window.getSelection().toString().length > 0) return
      if (notification.type == "like" || notification.type == "reply") navigate(`/posts/${notification.value}`)
    }}>

      <div className='avatars-wrapper'>
        {notifiers.map(notifier => (
          notifier?.avatar && notifier.id && (
            <NavLink key={notifier.id} onClick={(e) => e.stopPropagation()} to={`/profile/${notifier.id}`}><img className='avatar clickable-icon' src={notifier.avatar} alt="avatar" /></NavLink>
          )
        ))}
      </div>

      {(() => {
        let text
        switch (notification.type) {
          case "like":
            text = "liked your post"
            break
          case "follow":
            text = "followed you"
            break
          case "reply":
            text = "replied to your post"
            break
          default:
            break
        }

        return (
          <>
            {notification?.total_count == 1 && <h2>{notifiers[0]?.username} {text}</h2>}
            {notification?.total_count == 2 && <h2>{notifiers[0]?.username} and {notifiers[1]?.username} {text}</h2>}
            {notification?.total_count > 2 && <h2>{notifiers[0]?.username} and {notification?.total_count - 1} others {text}</h2>}
          </>
        )


      })()}
      <p>{created_at.toLocaleString()}</p>
    </div>
  )
})

function Notifications() {
  const navigate = useNavigate()
  const { socket } = useAuth()

  const [date, setDate] = useState(new Date())
  const [notifications, setNotifications] = useState([])

  const { addToast } = useContext(ToastContext)

  const canLoadNotificationsRef = useRef(true)

  useEffect(() => {
    if (!socket) return

    socket.on('notification', async (data) => {

      setNotifications(prev => {
        const exists = prev.some(item => item.notification.id === data.notification.id);

        if (exists) {
          //COLLAPSE NOTIFICATION WITH EXISTING ONE(S)
          return prev.map(item =>
            item.notification.id === data.notification.id
              ? {
                  ...item,
                  notification: {
                    ...item.notification,
                    total_count: item.notification.total_count + 1,
                    notifier_ids: [...item.notification.notifier_ids, data.notifier.id],
                  },
                  notifiers: [...item.notifiers, data.notifier],
                }
              : item
          );
        } else {
          //ADD NOTIFICATION TO THE TOP
          const newItem = {
            notification: {
              ...data.notification,
              notifier_ids: [data.notifier.id],
              total_count: 1,
            },
            notifiers: [data.notifier],
          }
          return [newItem, ...prev]
        }
      })
    })

    return () => {
      socket.off('notification')
    }
  }, [socket])

  const notificationsLengthRef = useRef(null)
  const notificationsBoxRef = useRef(null)

  const NotificationsScrollCheck = () => {
    if (notificationsLengthRef.current && (notificationsBoxRef.current.clientHeight + notificationsBoxRef.current.scrollTop >= notificationsBoxRef.current.scrollHeight - 200
            || !(notificationsBoxRef.current.scrollHeight > notificationsBoxRef.current.clientHeight))) {
      GetNotifications(notificationsLengthRef.current)
    }
  }

  useEffect(() => {
    notificationsLengthRef.current = notifications.length

    NotificationsScrollCheck()
  }, [notifications.length])


  useEffect(() => {
    GetNotifications(0)

    const handleScroll = () => {
      NotificationsScrollCheck()
    }

    const box = notificationsBoxRef.current
    box.addEventListener('scroll', handleScroll)
    return () => {
        box.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const GetNotifications = async (offset) => {
    if (!canLoadNotificationsRef.current) return
    canLoadNotificationsRef.current = false

    try {
      const response = await axios.get(`/auth/getnotifications/?offset=${offset}&date=${date}`, { withCredentials: true })

      setNotifications(prev => [...prev, ...response.data.notifications])
      notificationsLengthRef.current += response.data.notifications.length
      if (response.data.end) return

    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
    }

    canLoadNotificationsRef.current = true

    NotificationsScrollCheck()
  }

  return (
    <>
    <div className='notifications-wrapper'>
      <div className='notifications' ref={notificationsBoxRef}>
        <h1>Notifications</h1>

          {notifications.map((data) => (
            <NotificationItem
              key={data.notification.id}
              navigate={navigate}
              notification={data.notification}
              notifiers={data.notifiers}
            />
          ))}

        </div>
      </div>
    </>
  )
}

export default Notifications