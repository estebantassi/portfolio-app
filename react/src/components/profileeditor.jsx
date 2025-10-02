import { AuthContext } from '../context/authcontext'
import { useContext, useEffect, useRef, useState } from "react"
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { BiographyInput, TagInput, UsernameInput } from './inputs'
import { RotateCcw, Pencil } from 'lucide-react'

function ProfileEditor({ setUserdata }) {
    const { setUser, user, avatar, banner, isNetworkButtonDisabled, startnetworkrequest, networkControllerRef, updatetoken } = useContext(AuthContext)
    const { addToast } = useContext(ToastContext)
    const [show, setShow] = useState(false)

    const [data, setData] = useState({
        username: user.username,
        tag: user.tag,
        bio: user.bio,
        avatar: avatar,
        avatarurl: null,
        banner: banner,
        bannerurl: null
    })

    useEffect(() => {
        setUserdata(prev => ({ ...prev, ...user, avatar: avatar, banner: banner }))
    }, [user, avatar, banner])

    useEffect(() => {
        if (!show) return

        const handleKeyDown = (e) => { if (e.key === "Escape") close() }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [show])

    const close = async (resetdata = true) => {
        if (resetdata)
        {
            setData({
                username: user.username,
                tag: user.tag,
                bio: user.bio,
                avatar: avatar,
                avatarurl: null,
                banner: banner,
                bannerurl: null
            })
        }

        setShow(false)
    }

    const editprofile = async (e) => {
        e.preventDefault()
        startnetworkrequest()

        const formdata = new FormData()

        for (const key in data) {
            if (data[key] != null) {
                formdata.append(key, data[key])
            }
        }

        try {
            const response = await axios.post('/auth/editprofile',
                formdata
                , {
                    withCredentials: true,
                    signal: networkControllerRef.current.signal
                })

            setUser(prev => ({ ...prev, username: data.username, bio: data.bio, tag: data.tag }))
            addToast(response?.data?.message || "Success", "green")
            close(false)
        } catch (err) {
            if (err?.response?.status == 401) {
                const isloggedin = await updatetoken()
                if (isloggedin) editprofile(e)
            }
            else addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const usernameInputRef = useRef(null)
    const biographyInputRef = useRef(null)
    const tagInputRef = useRef(null)
    const [editprofileButtonDisabled, setEditprofileButtonDisabled] = useState(true)

    useEffect(() => {
        setEditprofileButtonDisabled(isNetworkButtonDisabled || !usernameInputRef.current?.checkValidity() || !biographyInputRef.current?.checkValidity() || !tagInputRef.current?.checkValidity() || (!isNaN(data.tag) && data.tag != user.id))
    }, [data])


    return (
        user && <>

            {show ? <>


                <div className='profileeditor-wrapper' onClick={() => close()}>
                    <form className="form profileeditor" onClick={(e) => e.stopPropagation()} onSubmit={(e) => editprofile(e)}>
                        <h1>Profile Editor</h1>

                        <div className='images'>
                            <label className='banner-wrapper' htmlFor="banner-upload">
                                <img src={data.bannerurl ? data.bannerurl : data.banner} alt="Banner" className='profileeditor-banner clickable' />
                            </label>

                            <label className='avatar-wrapper' htmlFor="avatar-upload">
                                <img src={data.avatarurl ? data.avatarurl : data.avatar} alt="Avatar" className='profileeditor-avatar clickable' />
                            </label>

                        </div>

                        <input id="avatar-upload" type="file" accept="image/*" hidden onChange={async (e) => {
                            const file = e.target.files[0]
                            if (file) {
                                setData(prev => ({
                                    ...prev,
                                    avatar: file,
                                    avatarurl: URL.createObjectURL(file)
                                }))
                            }
                            e.target.value = ''
                        }} />

                        <input id="banner-upload" type="file" accept="image/*" hidden onChange={(e) => {
                            const file = e.target.files[0]
                            if (file) {
                                setData(prev => ({
                                    ...prev,
                                    banner: file,
                                    bannerurl: URL.createObjectURL(file)
                                }))
                            }
                            e.target.value = ''
                        }} />

                        <label>Username</label>
                        <UsernameInput value={data.username} onChange={(e) => setData(prev => ({ ...prev, username: e.target.value }))} inputRef={usernameInputRef} />

                        <label>Biography</label>
                        <BiographyInput value={data.bio} onChange={(e) => setData(prev => ({ ...prev, bio: e.target.value }))} inputRef={biographyInputRef} />


                        <label>Tag</label>

                        <div className='tag'>
                            <TagInput value={data.tag} onChange={(e) => {
                                tagInputRef.current.setCustomValidity(!isNaN(e.target.value) && e.target.value != user.id ? "Tag cannot be a number other than your user ID" : "")
                                setData(prev => ({ ...prev, tag: e.target.value }))
                            }
                            } inputRef={tagInputRef} />

                            {user.id != data.tag && <RotateCcw className='clickable-icon' onClick={() => {
                                setData(prev => ({ ...prev, tag: user.id }))
                                tagInputRef.current.setCustomValidity("")
                            }}/>}
                        </div>

                        <button disabled={editprofileButtonDisabled}>Confirm</button>
                    </form>
                </div>
            </> : <Pencil className='clickable-icon' onClick={() => setShow(true)}/>}
        </>
    )


}

export default ProfileEditor