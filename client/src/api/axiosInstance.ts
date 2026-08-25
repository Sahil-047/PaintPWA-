import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearSession();
      const path = window.location.pathname;
      if (path !== '/' && path !== '/signup') {
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

/** Collapse identical in-flight GETs (Strict Mode remounts, duplicate effects, etc.). */
const inflightGets = new Map<string, Promise<AxiosResponse>>();

function getRequestKey(url: string, config?: AxiosRequestConfig) {
  return JSON.stringify({
    url,
    params: config?.params ?? null,
    raw: config?.paramsSerializer ?? null,
  });
}

const originalGet = axiosInstance.get.bind(axiosInstance);

axiosInstance.get = ((url: string, config?: AxiosRequestConfig) => {
  const key = getRequestKey(url, config);
  const existing = inflightGets.get(key);
  if (existing) return existing;

  const promise = originalGet(url, config).finally(() => {
    if (inflightGets.get(key) === promise) {
      inflightGets.delete(key);
    }
  }) as Promise<AxiosResponse>;

  inflightGets.set(key, promise);
  return promise;
}) as typeof axiosInstance.get;
