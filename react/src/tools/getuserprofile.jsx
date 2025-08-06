import axios from "../api/axios"

const getuserprofile = async (id) => {

    const olduserdata = JSON.parse(localStorage.getItem(id))
    if ((olduserdata != null && new Date(olduserdata.expires) > new Date())) return olduserdata

    try {
        let response = await axios.get('/getuserprofile?id=' + id)
        delete response.data.message

        response.data.expires = new Date(Date.now() + 60 * 1000)

        localStorage.setItem(id, JSON.stringify(response.data))
        return response.data
    } catch (err) {
        return null
    }
}

export default getuserprofile