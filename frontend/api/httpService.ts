import axios, { AxiosError } from "axios";

const httpService = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL
});

httpService.interceptors.response.use((response) => {
    return response.data;
}, (error: AxiosError) => {
    if (error.response)
        return Promise.reject({
            status: error.response.status,
            data: error.response.data
        })
    return Promise.reject(error.request ? error.request : error.message)
});

export { httpService };
