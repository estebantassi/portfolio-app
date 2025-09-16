import axios from 'axios'
const BASE_URL = 'http://srv-captain--nodeserver'

export default axios.create({
    baseURL: BASE_URL
})