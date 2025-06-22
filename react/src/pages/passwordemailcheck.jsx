import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { useEffect } from 'react'
import { useParams } from "react-router"
import { useNavigate } from "react-router"

function PasswordEmailCheck() {

    const { addToast } = useContext(ToastContext)
    const { link } = useParams()
    const navigate = useNavigate()

    useEffect(() => {
        verify()
    }, [])

    const verify = async () => {
        try {
            const response = await axios.post('/passwordemailcheck', {
                token: link
            })

            navigate("/home")
            addToast(response.data, "green")
        } catch (err) {
            navigate("/home")
            addToast(err.response.data, "red")
        }
    }

    return (
        <>
        </>
    )
}

export default PasswordEmailCheck