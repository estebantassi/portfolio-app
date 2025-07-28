import { createContext, useEffect, useRef } from "react"
import '../css/toast.css'

export const ToastContext = createContext()

export const ToastProvider = ({ children }) => {

    const toastContainerRef = useRef(null)
    const lastToastTimeRef = useRef(0)

    const addToast = (text, color, onAccept=null, onRefuse=null) => {
        const now = Date.now()
        const delay = Math.max(0, lastToastTimeRef.current + 500 - now)
        setTimeout(() => {

            const toastElement = document.createElement('div')
            toastElement.style = `background-color: ${color}`
            toastElement.className = `toast toast-regular`
            toastElement.textContent = text
            toastContainerRef.current.appendChild(toastElement)

            if (onAccept != null && onRefuse != null)
            {
                toastElement.className = `toast toast-call`

                const buttonDiv = document.createElement('div')
                const callButtonAccept = document.createElement('button')
                const callButtonRefuse = document.createElement('button')

                callButtonAccept.onclick = ()=> {
                    onAccept()
                    toastElement.style = `background-color: gray`
                    callButtonAccept.disabled = true
                    callButtonRefuse.disabled = true
                }
                callButtonRefuse.onclick = ()=> {
                    onRefuse()
                    toastElement.style = `background-color: gray`
                    callButtonAccept.disabled = true
                    callButtonRefuse.disabled = true
                }

                callButtonAccept.textContent = "Accept"
                callButtonRefuse.textContent = "Refuse"

                callButtonAccept.className = 'toast-button accept'
                callButtonRefuse.className = 'toast-button refuse'
                buttonDiv.className = 'toast-button-wrapper'

                buttonDiv.appendChild(callButtonAccept)
                buttonDiv.appendChild(callButtonRefuse)
                toastElement.appendChild(buttonDiv)
            }

            const timeoutDuration = onAccept != null && onRefuse != null ? 10000 : 5000;

            setTimeout(() => removeToast(toastElement), timeoutDuration)
        }, delay)

        lastToastTimeRef.current = now + delay
    }

    const removeToast = (toastElement) => {
        if (toastElement && toastContainerRef.current.contains(toastElement)) toastContainerRef.current.removeChild(toastElement)
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