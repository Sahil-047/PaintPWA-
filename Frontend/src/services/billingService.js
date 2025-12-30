import axios from 'axios';
import { API_URL } from '../config/config';
import authService from './authService';

const billingService = {
  async createInvoice(items, taxRate = 18) {
    const token = authService.getToken();
    const response = await axios.post(
      `${API_URL}/billing/invoices`,
      { items, taxRate },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async getInvoices(page = 1, limit = 10) {
    const token = authService.getToken();
    const response = await axios.get(`${API_URL}/billing/invoices`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { page, limit },
    });
    return response.data;
  },

  async getInvoice(invoiceId) {
    const token = authService.getToken();
    const response = await axios.get(`${API_URL}/billing/invoices/${invoiceId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};

export default billingService;

