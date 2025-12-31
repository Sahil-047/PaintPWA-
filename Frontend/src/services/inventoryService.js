import axios from 'axios';
import { API_URL } from '../config/config';
import authService from './authService';

const inventoryService = {
  async getBrands() {
    const token = authService.getToken();
    const response = await axios.get(`${API_URL}/inventory/brands`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getProductsByBrand(brandId) {
    const token = authService.getToken();
    const response = await axios.get(`${API_URL}/inventory/products/${brandId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getAllProducts(search = '', brand = '') {
    const token = authService.getToken();
    const params = {};
    if (search) params.search = search;
    if (brand) params.brand = brand;
    
    const response = await axios.get(`${API_URL}/inventory/products`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
    });
    return response.data;
  },

  async updateStock(productId, stock) {
    const token = authService.getToken();
    const response = await axios.patch(
      `${API_URL}/inventory/products/${productId}/stock`,
      { stock },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async createBrand(name, image = '') {
    const token = authService.getToken();
    const response = await axios.post(
      `${API_URL}/inventory/brands`,
      { name, image },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async createProduct(productData) {
    const token = authService.getToken();
    const response = await axios.post(
      `${API_URL}/inventory/products`,
      productData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async getProductTypesByBrand(brandId) {
    const token = authService.getToken();
    const response = await axios.get(`${API_URL}/inventory/types/${brandId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getProductsByBrandAndType(brandId, type) {
    const token = authService.getToken();
    const response = await axios.get(
      `${API_URL}/inventory/products/${brandId}/${encodeURIComponent(type)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async createOrUpdateProductType(name, brand, icon = '') {
    const token = authService.getToken();
    const response = await axios.post(
      `${API_URL}/inventory/types`,
      { name, brand, icon },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};

export default inventoryService;

