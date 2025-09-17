import axios from 'axios'
const BASE_URL = 'https://nodejsserver.portfolioapp.org'

export default axios.create({
    baseURL: BASE_URL
})