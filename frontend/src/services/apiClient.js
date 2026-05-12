import axios from 'axios'
import API from '@/config/api'

const client = axios.create({ baseURL: API.BASE, timeout: 15000 })

// JWT token'ı her isteğe ekle
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('finara_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// Global hata yönetimi
client.interceptors.response.use(
    (res) => res.data,
    (err) => {
        const msg = err.response?.data?.detail ?? err.message ?? 'Bilinmeyen hata'
        return Promise.reject(new Error(msg))
    }
)

export default client