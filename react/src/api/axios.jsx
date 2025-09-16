import axios from 'axios'
const BASE_URL = 'http://192.168.1.71:4444'

export default axios.create({
    baseURL: BASE_URL
})