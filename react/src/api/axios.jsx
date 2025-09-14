import axios from 'axios'
const BASE_URL = 'https://portfolio-app-yyju.onrender.com'

export default axios.create({
    baseURL: BASE_URL
})