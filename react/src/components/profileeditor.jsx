import { AuthContext } from '../context/authcontext'
import { useContext, useState } from "react"


function ProfileEditor() {
    const { user } = useContext(AuthContext)

    const [data, setData] = useState({
        username: user.username,
        bio: "",
        avatar: localStorage.getItem("avatar"),
        banner: localStorage.getItem("banner")
    })

    const editprofile = async (e) => {
        e.preventDefault()

        console.log(data)
        try {
            return
            const response = await axios.post('/auth/editprofile', {
                
            }, {
                withCredentials: true
            })


        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }
  
  return (
    user ? <>
    
    <div>
      <h1>PROFILE EDITOR</h1>

    <form onSubmit={(e) => editprofile(e)}>
        <label htmlFor="avatar-upload">
            <img src={data.avatar} alt="Avatar"/>
        </label>

        <input id="avatar-upload"  type="file" accept="image/*" hidden onChange={(e) => {
            const file = e.target.files[0]
            if (file) {
                setData({ ...data, avatar: file })
            }
        }}/>

        <label htmlFor="banner-upload">
            <img src={data.banner} alt="Banner"/>
        </label>

        <input id="banner-upload"  type="file" accept="image/*" hidden onChange={(e) => {
            const file = e.target.files[0]
            if (file) {
                setData({ ...data, banner: file })
            }
        }}/>
        

        <button>Send</button>
    </form>

    </div>

    </> : null
  )

  
}

export default ProfileEditor