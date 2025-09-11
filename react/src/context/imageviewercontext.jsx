import { createContext, useContext, useEffect, useRef, useState } from "react"
import "../css/imageviewer.css"

export const ImageViewerContext = createContext()

export const ImageViewerProvider = ({ children }) => {

    const [show, setShow] = useState(false)
    const [src, setSrc] = useState("")
    const [alt, setAlt] = useState("")
    const [scale, setScale] = useState(1)
    const imageRef = useRef(null)

    useEffect(() => {
        if (!show) return

        const handleWheel = (e) => {
            const delta = e.deltaY > 0 ? -0.3 : 0.3
            setScale(prev => Math.min(Math.max(prev + delta, 0.2), 5))
        }

        const handleKeyDown = (e) => { if (e.key === "Escape") closeImage() }
        window.addEventListener("keydown", handleKeyDown)
        window.addEventListener("wheel", handleWheel)
        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener("wheel", handleWheel)
        }
    }, [show])

    const showImage = (src, alt) => {
        setShow(true)
        setSrc(src)
        setAlt(alt)
        setScale(1)
    }

    const closeImage = () => {
        setShow(false)
        setSrc("")
        setAlt("")
        setScale(1)
    }

    let contextData = {
        showImage
    }

    return (
        <ImageViewerContext.Provider value={contextData}>
            {show && <div className="imageviewer" onClick={() => closeImage()}>
                <img style={{ transform: `scale(${scale})` }} ref={imageRef} src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
            </div>}
            {children}
        </ImageViewerContext.Provider>
    )
}

export const useImageViewer = () => useContext(ImageViewerContext)