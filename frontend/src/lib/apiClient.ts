import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

// ─── API Base URL ─────────────────────────────────────────
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ─── Create Axios Instance ────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor ──────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add request timestamp for debugging
    config.headers['X-Request-Time'] = new Date().toISOString();
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// ─── Response Interceptor ─────────────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Format error for consistent handling
    const formattedError = formatApiError(error);
    return Promise.reject(formattedError);
  },
);

// ─── Error Formatter ──────────────────────────────────────
export interface ApiError {
  message: string;
  statusCode: number;
  errors?: unknown[];
  isNetworkError: boolean;
}

const formatApiError = (error: AxiosError): ApiError => {
  if (!error.response) {
    return {
      message: 'Network error. Please check your internet connection.',
      statusCode: 0,
      isNetworkError: true,
    };
  }

  const responseData = error.response.data as {
    message?: string;
    errors?: unknown[];
  };

  return {
    message:
      responseData?.message || error.message || 'An unexpected error occurred.',
    statusCode: error.response.status,
    errors: responseData?.errors,
    isNetworkError: false,
  };
};

// ─── API Helper Functions ─────────────────────────────────

/**
 * Build query string from params object
 * Removes undefined and null values automatically
 */
export const buildQueryString = (params: Record<string, unknown>): string => {
  const cleanParams = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    )
    .reduce(
      (acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      },
      {} as Record<string, string>,
    );

  const queryString = new URLSearchParams(cleanParams).toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Upload file with multipart form data
 */
export const uploadFile = async (
  url: string,
  file: File,
  fieldName = 'photo',
  onProgress?: (progress: number) => void,
): Promise<AxiosResponse> => {
  const formData = new FormData();
  formData.append(fieldName, file);

  return apiClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        onProgress(progress);
      }
    },
  });
};

/**
 * Download file and trigger browser download
 */
export const downloadFile = async (
  url: string,
  filename: string,
  method: 'GET' | 'POST' = 'GET',
  data?: unknown,
): Promise<void> => {
  const response = await apiClient.request({
    url,
    method,
    data,
    responseType: 'blob',
  });

  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

export default apiClient;
