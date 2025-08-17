import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useAuth } from "./authcontext"
import { ToastContext } from "./toastcontext"
import axios from "../api/axios"
import '../css/call.css'
import getuserprofile from "../tools/getuserprofile"

export const CallContext = createContext()

export const CallProvider = ({ children }) => {

    const { socket } = useAuth()
    const { addToast } = useContext(ToastContext)

    const [isInCall, setIsInCall] = useState(null)
    const isInCallRef = useRef(null)
    const callTimeoutRef = useRef(null)

    const streamRef = useRef(null)
    const peerRef = useRef(null)
    const remoteAudioRef = useRef(null)

    const iceCandidateQueue = useRef([]);

    useEffect(() => {
        if (!socket) return

        socket.on("incomingcall", async (data) => {
            const caller = await getuserprofile([parseInt(data.from, 10)])
            if (caller == null) return addToast("Error loading user", "red")

            const handleAccept = () => acceptCall(data)
            const handleRefuse = () => rejectCall(data.from)

            addToast(`Incoming call from ${caller[0].username}`, "green", handleAccept, handleRefuse)
        })

        socket.on("acceptedcall", async (data) => {
            if (data.from == isInCallRef.current.data.id)
            isInCallRef.current = {...isInCallRef.current, online: true}
            setIsInCall(prev => ({...prev, online: true}))
            if (peerRef.current) await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))

            for (const candidate of iceCandidateQueue.current) {
                try {
                    await peerRef.current.addIceCandidate(candidate)
                } catch (err) {
                    console.error("Failed to add queued ICE candidate", err)
                }
            }
            iceCandidateQueue.current = []
        })

        socket.on("endedcall", async () => {
            if (isInCallRef.current) endCall(false)
        })

        socket.on("signal", async ({ from, data }) => {
            if (data.candidate) {
                if (peerRef.current && peerRef.current.remoteDescription) {
                    try {
                        await peerRef.current.addIceCandidate(new RTCIceCandidate(data))
                    } catch (err) {
                        console.error("Failed to add ICE candidate", err)
                    }
                } else {
                    iceCandidateQueue.current.push(new RTCIceCandidate(data))
                }
            }
        })

        return () => {
            socket.off("endedcall")
            socket.off("incomingcall")
            socket.off('signal')
            socket.off('acceptedcall')
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

    const acceptCall = async (data) => {
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })

            peerRef.current = createPeerConnection(data.from)

            
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.offer))
            
            streamRef.current.getTracks().forEach(track =>
                peerRef.current.addTrack(track, streamRef.current)
            )

            const answer = await peerRef.current.createAnswer()
            await peerRef.current.setLocalDescription(answer)

            const response = await axios.post('/auth/acceptcall', {
                callerid: data.from,
                answer
            }, {
                withCredentials: true
            })

            const caller = await getuserprofile([parseInt(data.from, 10)])
            if (caller == null) return addToast("Error loading user", "red")

            startCallTimeout()

            isInCallRef.current = {data: caller[0], online: true}
            setIsInCall({data: caller[0], online: true})
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const startCall = async (userdata) => {
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })

            peerRef.current = createPeerConnection(userdata.id)

            streamRef.current.getTracks().forEach(track =>
                peerRef.current.addTrack(track, streamRef.current)
            )
            
            const offer = await peerRef.current.createOffer()
            await peerRef.current.setLocalDescription(offer)

            const response = await axios.post('/auth/requestcall', {
                calleeid: userdata.id,
                offer: offer
            }, {
                withCredentials: true
            })

            if (response.data.end) endCall(false)

            startCallTimeout()

            addToast(response?.data?.message || "Success", 'green')
            isInCallRef.current = {data: userdata, online: false}
            setIsInCall({data: userdata, online: false})
        } catch (err) {
            endCall(false)
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const startCallTimeout = async () => {
        callTimeoutRef.current = setTimeout(async () => {
            try {

                const response = await axios.get('/auth/getcallstate', {
                    withCredentials: true
                })

                if (response?.data?.state == false) return endCall(false)

            } catch (err) {
                return endCall(false)
            }

            startCallTimeout()
        }, 5000)
    }

    const rejectCall = async (from) => {
        try {
            const response = await axios.post('/auth/rejectcall', {
                from
            }, {
                withCredentials: true
            })

        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const endCall = async (share = true) => {
        if (share)
        {
            try {
                await axios.post('/auth/endcall', {}, {
                    withCredentials: true
                })
            } catch (err) {
                addToast(err.response?.data?.message || "An error occurred", "red")
            }
        }

        if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current)
            callTimeoutRef.current = null
        }
        
        isInCallRef.current = null
        setIsInCall(null)

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

        addToast("Call ended", "red")
    }

    let contextData = {
        startCall
    }

    return (
        <CallContext.Provider value={contextData}>
            {isInCall && <>

            <p>Call with {isInCall.data.username}</p>
            <img src={isInCall.data.avatar} alt="avatar" className={`avatar ${isInCall.online ? "call-online-avatar" : "call-offline-avatar"}`} />

            <button onClick={() => {isInCall.online ? endCall() : endCall(false)}}>End Call</button>
            
            </>
            }
            <audio ref={remoteAudioRef} autoPlay />
            {children}
        </CallContext.Provider>
    )
    
}

export const useCall = () => useContext(CallContext)