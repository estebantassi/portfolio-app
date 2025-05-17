import { createContext, useRef } from "react"
import '../css/toast.css'

export const ToastContext = createContext()

export const ToastProvider = ({ children }) => {

    const toastContainerRef = useRef(null)
    const lastToastTimeRef = useRef(0)

    const addToast = (newToast, newColor) => {
        const now = Date.now()
        const delay = Math.max(0, lastToastTimeRef.current + 500 - now)
        setTimeout(() => {

            const toastElement = document.createElement('div')
            toastElement.style = `background-color: ${newColor}`
            toastElement.className = `toast`
            toastElement.textContent = newToast
            toastContainerRef.current.appendChild(toastElement)

            setTimeout(() => removeToast(), 5000)
        }, delay)

        lastToastTimeRef.current = now + delay
    }

    const removeToast = () => {
        toastContainerRef.current.removeChild(toastContainerRef.current.firstChild)
    }

    let contextData = {
        addToast
    }
    return (
        <ToastContext.Provider value={contextData}>
            <div className="toastbox" ref={toastContainerRef}></div>
            {children}
        </ToastContext.Provider>
    )
    
}