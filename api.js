import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { API_URL } = Constants.expoConfig.extra;

const api = axios.create({


    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
    },
});

api.interceptors.request.use(
    async config => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);


export default api;
