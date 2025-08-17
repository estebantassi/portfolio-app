import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { useEffect } from 'react'
import { useParams } from "react-router"
import { useNavigate } from "react-router"

function NewEmailCheck() {

    const { addToast } = useContext(ToastContext)
    const { link } = useParams()
    const navigate = useNavigate()

    useEffect(() => {
        verify()
    }, [])

    const verify = async () => {
        try {
            const response = await axios.post('/newemailcheck', {
                token: link
            })

            addToast(response?.data?.message || "Success", "green")
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        } finally {
            navigate("/home")
        }
        
    }

    return (
        <>
        </>
    )
}

export default NewEmailCheck