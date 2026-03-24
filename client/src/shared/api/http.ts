import axios from 'axios';
import { env } from '../config/env.ts';

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});
