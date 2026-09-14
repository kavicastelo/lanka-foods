export type WoltErrorCode =
  | 'WOLT_AUTHENTICATION_ERROR'
  | 'WOLT_AUTHORIZATION_ERROR'
  | 'WOLT_RATE_LIMIT'
  | 'WOLT_UNAVAILABLE'
  | 'WOLT_INVALID_REQUEST'
  | 'WOLT_DELIVERY_UNAVAILABLE'
  | 'WOLT_COD_NOT_SUPPORTED'
  | 'WOLT_CANCELLATION_REJECTED'
  | 'WOLT_UNKNOWN_ERROR';

export class WoltApiError extends Error {
  statusCode: number;
  errorCode: WoltErrorCode;
  rawDetails?: any;

  constructor(message: string, statusCode: number, errorCode: WoltErrorCode, rawDetails?: any) {
    super(message);
    this.name = 'WoltApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.rawDetails = rawDetails;
  }
}

export class WoltDriveClient {
  private baseUrl: string;

  constructor(env: 'development' | 'production' | 'mock' = 'development') {
    if (env === 'production') {
      this.baseUrl = 'https://daas-public-api.wolt.com/v1';
    } else {
      this.baseUrl = 'https://daas-public-api.development.dev.wolt.com/v1';
    }
  }

  private classifyError(status: number, data: any): WoltErrorCode {
    if (status === 401) return 'WOLT_AUTHENTICATION_ERROR';
    if (status === 403) return 'WOLT_AUTHORIZATION_ERROR';
    if (status === 429) return 'WOLT_RATE_LIMIT';
    if (status >= 500) return 'WOLT_UNAVAILABLE';

    const errCodeStr = (data?.error_code || data?.code || data?.message || '').toLowerCase();
    if (errCodeStr.includes('cash') || errCodeStr.includes('cod')) {
      return 'WOLT_COD_NOT_SUPPORTED';
    }
    if (errCodeStr.includes('cancel')) {
      return 'WOLT_CANCELLATION_REJECTED';
    }
    if (errCodeStr.includes('outside') || errCodeStr.includes('unsupported') || errCodeStr.includes('no_coverage')) {
      return 'WOLT_DELIVERY_UNAVAILABLE';
    }
    if (status === 400) return 'WOLT_INVALID_REQUEST';

    return 'WOLT_UNKNOWN_ERROR';
  }

  private async request<T = any>(
    path: string,
    options: {
      method?: string;
      accessToken?: string;
      body?: any;
    }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (options.accessToken) {
      headers['Authorization'] = `Bearer ${options.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { raw: responseText };
      }

      if (!response.ok) {
        const classified = this.classifyError(response.status, data);
        const errorMsg = data?.error_reason || data?.message || `Wolt API error (${response.status})`;
        throw new WoltApiError(errorMsg, response.status, classified, data);
      }

      return data as T;
    } catch (err: any) {
      if (err instanceof WoltApiError) throw err;
      throw new WoltApiError(
        err.message || 'Network error communicating with Wolt Drive API',
        503,
        'WOLT_UNAVAILABLE',
        err
      );
    }
  }

  /**
   * Venueful Shipment Promise (Delivery Quote / Availability)
   * POST /v1/venues/{venue_id}/shipment-promises
   */
  async createShipmentPromise(
    venueId: string,
    accessToken: string,
    payload: {
      pickup?: { location?: { formatted_address?: string } };
      dropoff: { location: { formatted_address: string; coordinates?: [number, number] } };
    }
  ) {
    return this.request(`/venues/${venueId}/shipment-promises`, {
      method: 'POST',
      accessToken,
      body: payload,
    });
  }

  /**
   * Venueful Delivery Order Creation
   * POST /v1/venues/{venue_id}/deliveries
   */
  async createDelivery(venueId: string, accessToken: string, payload: any) {
    return this.request(`/venues/${venueId}/deliveries`, {
      method: 'POST',
      accessToken,
      body: payload,
    });
  }

  /**
   * Cancel Delivery Order
   * POST /v1/venues/{venue_id}/deliveries/{delivery_id}/cancel
   */
  async cancelDelivery(venueId: string, deliveryId: string, accessToken: string, reason?: string) {
    return this.request(`/venues/${venueId}/deliveries/${deliveryId}/cancel`, {
      method: 'POST',
      accessToken,
      body: reason ? { reason } : {},
    });
  }

  /**
   * Get Delivery Details
   * GET /v1/venues/{venue_id}/deliveries/{delivery_id}
   */
  async getDelivery(venueId: string, deliveryId: string, accessToken: string) {
    return this.request(`/venues/${venueId}/deliveries/${deliveryId}`, {
      method: 'GET',
      accessToken,
    });
  }
}
