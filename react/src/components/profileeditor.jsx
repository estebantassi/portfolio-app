import { AuthContext } from '../context/authcontext'
import { useContext, useEffect, useRef, useState } from "react"
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { BiographyInput, TagInput, UsernameInput } from './inputs'


function ProfileEditor() {
    const { setUser, user, avatar, banner, isNetworkButtonDisabled, startnetworkrequest, networkControllerRef } = useContext(AuthContext)
    const { addToast } = useContext(ToastContext)

    const [data, setData] = useState({
        username: user.username,
        tag: user.tag,
        bio: user.bio,
        avatar: avatar,
        avatarurl: null,
        banner: banner,
        bannerurl: null
    })

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
            
            setUser(prev => ({...prev, username: data.username, bio: data.bio, tag: data.tag }))
            
            addToast(response?.data?.message || "Success", "green")

        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const usernameInputRef = useRef(null)
    const biographyInputRef = useRef(null)
    const tagInputRef = useRef(null)
    const editprofileButtonDisabled = isNetworkButtonDisabled || !usernameInputRef.current?.checkValidity() || !biographyInputRef.current?.checkValidity() || !tagInputRef.current?.checkValidity() || (!isNaN(data.tag) && data.tag != user.id)

    return (
        user ? <>

            <div>
                <h1>PROFILE EDITOR</h1>

                <form onSubmit={(e) => editprofile(e)}>
                    <label htmlFor="avatar-upload">
                        {data.avatarurl ? <img src={data.avatarurl} alt="Avatar" className='avatar' /> : data.avatar && <img src={data.avatar} alt="Avatar" className='avatar' />}
                    </label>

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

                    <label htmlFor="banner-upload">
                        {data.bannerurl ? <img src={data.bannerurl} alt="Banner" className='banner' /> : data.banner ? <img src={data.banner} alt="Banner" className='banner' /> : null}
                    </label>

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
                    {user.id != data.tag && <button type="button" onClick={() => {
                        setData(prev => ({ ...prev, tag: user.id }))
                        tagInputRef.current.setCustomValidity("")
                    }}>Reset tag</button>}

                    <TagInput value={data.tag} onChange={(e) =>
                        {
                            tagInputRef.current.setCustomValidity(!isNaN(e.target.value) && e.target.value != user.id ? "Tag cannot be a number other than your user ID" : "")
                            setData(prev => ({ ...prev, tag: e.target.value }))
                        }
                        } inputRef={tagInputRef} />

                    <button disabled={editprofileButtonDisabled}>Confirm</button>
                </form>

            </div>

        </> : null
    )


}

export default ProfileEditor