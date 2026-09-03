import { applicationsApi } from './applicationsApi';
import { authApi } from './authApi';
import { categoriesApi } from './categoriesApi';
import { dashboardApi } from './dashboardApi';
import { favoritesApi } from './favoritesApi';
import { financialsApi } from './financialsApi';
import { mediaApi } from './mediaApi';
import { menuApi } from './menuApi';
import { ordersApi } from './ordersApi';
import { restaurantsApi } from './restaurantsApi';
import { reviewsApi } from './reviewsApi';

export {
  authApi,
  restaurantsApi,
  categoriesApi,
  menuApi,
  ordersApi,
  reviewsApi,
  favoritesApi,
  applicationsApi,
  financialsApi,
  dashboardApi,
  mediaApi,
};

// Base44 Compatibility Bridge (for seamless migration without breaking components)
export const base44 = {
  auth: {
    me: () => authApi.getMe(),
    loginViaEmailPassword: (email, password) => authApi.login(email, password),
    register: (data) => authApi.register(data),
    updateMe: (data) => authApi.updateMe(data),
    logout: () => authApi.logout(),
    verifyOtp: async () => ({ status: 'success' }),
    resendOtp: async () => ({ status: 'success' }),
    setToken: (token) => {
      if (token) localStorage.setItem('access_token', token);
    },
  },
  entities: {
    Restaurant: {
      list: (params) => restaurantsApi.getRestaurants(params),
      filter: (params) => restaurantsApi.getRestaurants(params),
      get: (id) => restaurantsApi.getRestaurantById(id),
      update: (id, data) => restaurantsApi.updateRestaurant(id, data),
    },
    MenuItem: {
      get: (id) => menuApi.getMenuItemById(id),
      filter: (params) => menuApi.getMenuItems(params.restaurant_id || params.restaurantId, params),
      create: (data) => menuApi.createMenuItem(data.restaurant_id || data.restaurantId, data),
      update: (id, data) => menuApi.updateMenuItem(id, data),
      delete: (id) => menuApi.deleteMenuItem(id),
    },
    Order: {
      list: (params) => ordersApi.getOrders(params),
      filter: (params) => ordersApi.getOrders(params),
      get: (id) => ordersApi.getOrderById(id),
      create: (data) => ordersApi.createOrder(data),
      update: (id, data) => ordersApi.updateOrderStatus(id, data.status, data.reason),
    },
    Review: {
      filter: (params) => reviewsApi.getRestaurantReviews(params.restaurant_id || params.restaurantId),
      create: (data) => reviewsApi.createReview(data),
    },
    RestaurantApplication: {
      create: (data) => applicationsApi.apply(data),
      list: (params) => applicationsApi.getApplications(params),
    },
  },
  functions: {
    getDashboardMetrics: (scope, restaurantId) => dashboardApi.getDashboardMetrics(scope, restaurantId),
  },
};
