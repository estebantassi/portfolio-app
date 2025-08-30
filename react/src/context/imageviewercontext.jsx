import { createContext, useContext, useEffect, useState } from "react"
import "../css/imageviewer.css"

export const ImageViewerContext = createContext()

export const ImageViewerProvider = ({ children }) => {

    const [show, setShow] = useState(false)
    const [src, setSrc] = useState("")
    const [alt, setAlt] = useState("")

    useEffect(() => {
        if (!show) return

        const handleKeyDown = (e) => { if (e.key === "Escape") closeImage() }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [show])

    const showImage = (src, alt) => {
        setShow(true)
        setSrc(src)
        setAlt(alt)
    }

    const closeImage = () => {
        setShow(false)
        setSrc("")
        setAlt("")
    }

    let contextData = {
        showImage
    }

    return (
        <ImageViewerContext.Provider value={contextData}>
            {show && <div className="imageviewer" onClick={() => closeImage()}>
                <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
            </div>}
            {children}
        </ImageViewerContext.Provider>
    )
}

export const useImageViewer = () => useContext(ImageViewerContext)