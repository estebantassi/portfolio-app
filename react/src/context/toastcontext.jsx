import { createContext, useEffect, useRef } from "react"
import '../css/toast.css'

export const ToastContext = createContext()

export const ToastProvider = ({ children }) => {

    const toastContainerRef = useRef(null)
    const lastToastTimeRef = useRef(0)

    const addToast = (text, color, onAccept=null, onRefuse=null, used=false) => {
        const now = Date.now()
        const delay = Math.max(0, lastToastTimeRef.current + 500 - now)
        setTimeout(() => {

            const toastElement = document.createElement('div')
            toastElement.style = `background-color: ${color}`
            toastElement.className = `toast`
            toastElement.textContent = text
            toastContainerRef.current.appendChild(toastElement)

            let isSaved = onAccept != null && onRefuse != null
            if (isSaved)
            {
                if (!used)
                {
                    const existing = JSON.parse(localStorage.getItem('pendingToasts') || '[]')
                    existing.push({ text, color, onAccept, onRefuse, used: true })
                    localStorage.setItem('pendingToasts', JSON.stringify(existing))
                }

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

            setTimeout(() => removeToast(toastElement, isSaved), 5000)
        }, delay)

        lastToastTimeRef.current = now + delay
    }

    useEffect(() => {
        const storedToasts = JSON.parse(localStorage.getItem('pendingToasts') || '[]')
        storedToasts.forEach(({ text, color, onAccept, onRefuse, used }) => {
            addToast(text, color, onAccept, onRefuse, used)
        })
    }, [])

    const removeToast = (toastElement, isSaved) => {
        if (toastElement && toastContainerRef.current.contains(toastElement)) toastContainerRef.current.removeChild(toastElement)

        if (isSaved)
        {
            const existing = JSON.parse(localStorage.getItem('pendingToasts'))
            if (!existing) return
            existing.shift()
            localStorage.setItem('pendingToasts', JSON.stringify(existing))
        }
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