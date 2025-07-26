import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useAuth } from "./authcontext"

export const CallContext = createContext()

export const CallProvider = ({ children }) => {

    const { socket } = useAuth()
    const [incomingCall, setIncomingCall] = useState(null)
    const [isInCall, setIsInCall] = useState(false)
    const streamRef = useRef(null)
    const peerRef = useRef(null)
    const remoteAudioRef = useRef(null)

    useEffect(() => {
        if (!socket) return

        socket.on("signal", async ({ from, data }) => {
            if (data.type === "offer") {
                setIncomingCall({ from, offer: data })
            } else if (data.type === "answer") {
                if (peerRef.current) await peerRef.current.setRemoteDescription(new RTCSessionDescription(data))
            } else if (data.candidate) {
                try {
                    if (peerRef.current) await peerRef.current.addIceCandidate(new RTCIceCandidate(data))
                } catch (err) {
                    console.error("Failed to add ICE candidate", err)
                }
            }
        })

        return () => {
            socket.off('signal')
        }
    }, [socket])

    const createPeerConnection = (targetId) => {
        const peer = new RTCPeerConnection()

        peer.ontrack = (event) => {
            remoteAudioRef.current.srcObject = event.streams[0]
            remoteAudioRef.current.play()
        }

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("signal", { to: targetId, data: event.candidate })
            }
        }

        return peer
    }

    const acceptCall = async (from, offer) => {
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })

            peerRef.current = createPeerConnection(from)

            streamRef.current.getTracks().forEach(track =>
                peerRef.current.addTrack(track, streamRef.current)
            )

            await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer))

            const answer = await peerRef.current.createAnswer()
            await peerRef.current.setLocalDescription(answer)

            socket.emit("signal", { to: from, data: answer })

            setIsInCall(true)

            setIncomingCall(null)
        } catch (err) {
            console.error("Failed to accept call:", err)
            alert("Microphone access denied or failed")
            setIncomingCall(null)
        }
    }


    const startCall = async (id) => {
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })

            peerRef.current = createPeerConnection(id)

            streamRef.current.getTracks().forEach(track =>
                peerRef.current.addTrack(track, streamRef.current)
            )

            const offer = await peerRef.current.createOffer()
            await peerRef.current.setLocalDescription(offer)

            socket.emit("signal", { to: id, data: offer })
        } catch (err) {
            console.error("Failed to start call:", err)
            alert("Microphone access denied or failed")
        }
    }

    const endCall = () => {
        setIsInCall(false)
        if (peerRef.current) {
            peerRef.current.close()
            peerRef.current = null
        }

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
    }

    let contextData = {
        startCall
    }

    return (
        <CallContext.Provider value={contextData}>
            {incomingCall && (
                <div>
                    <p>📞 Incoming call from user {incomingCall.from}</p>
                    <button onClick={() => acceptCall(incomingCall.from, incomingCall.offer)}>Accept</button>
                    <button onClick={() => setIncomingCall(null)}>Reject</button>
                </div>
            )}

            {isInCall && <button onClick={() => endCall()}>End Call</button>}
            <audio ref={remoteAudioRef} autoPlay />
            {children}
        </CallContext.Provider>
    )
    
}

export const useCall = () => useContext(CallContext)