import axios from 'axios';
import type { Product, Sale, SystemConfig } from '../types';

// Centralizamos la URL de la API
const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname.includes('onrender.com')) {
            return 'https://aronium-pos-1aronium-backend.onrender.com/api';
        }
        return `http://${hostname}:5000/api`;
    }
    return 'http://localhost:5000/api';
};

export const API_URL = import.meta.env.VITE_API_URL || getBaseUrl();

// Creamos una instancia de axios configurada
export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Servicios expuestos para los componentes
export const apiService = {
    // Configuración
    config: {
        get: async (): Promise<SystemConfig> => {
            const { data } = await api.get('/config');
            return data;
        },
        update: async (key: string, value: number) => {
            const { data } = await api.post('/config', { key, value });
            return data;
        }
    },

    // Productos
    products: {
        getAll: async (): Promise<Product[]> => {
            const { data } = await api.get('/products');
            return data;
        },
        create: async (product: Omit<Product, 'id'>): Promise<Product> => {
            const { data } = await api.post('/products', product);
            return data;
        },
        update: async (id: number, product: Partial<Product>): Promise<Product> => {
            const { data } = await api.put(`/products/${id}`, product);
            return data;
        },
        delete: async (id: number) => {
            const { data } = await api.delete(`/products/${id}`);
            return data;
        },
        bulkDelete: async (ids: number[]) => {
            const { data } = await api.post('/products/bulk-delete', { ids });
            return data;
        },
        bulkImport: async (products: Partial<Product>[]) => {
            const { data } = await api.post('/products/bulk', products);
            return data;
        }
    },

    // Ventas
    sales: {
        getAll: async (): Promise<Sale[]> => {
            const { data } = await api.get('/sales');
            return data;
        },
        create: async (saleData: any) => {
            const { data } = await api.post('/sales', saleData);
            return data;
        },
        getById: async (id: number) => {
            const { data } = await api.get(`/sales/${id}`);
            return data;
        },
        delete: async (id: number) => {
            const { data } = await api.delete(`/sales/${id}`);
            return data;
        }
    },

    // Subidas (Imágenes)
    uploads: {
        uploadImage: async (file: File): Promise<{ imageUrl: string }> => {
            const formData = new FormData();
            formData.append('image', file);
            
            // Usamos post directo para manejar formData correctamente sin los headers JSON por defecto
            const { data } = await axios.post(`${API_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return data;
        }
    }
};
