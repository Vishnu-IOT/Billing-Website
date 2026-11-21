import { axios, BASE_URL, getAuthHeaders } from './client';

const promotionError = (error, fallback) =>
  new Error(error.response?.data?.message || fallback);

export async function fetchPromotionOffersAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/promotions/offers`, getAuthHeaders());
    return response.data;
  } catch (error) {
    throw promotionError(error, 'Failed to load offers');
  }
}

export async function createPromotionOfferAPI(payload) {
  try {
    const response = await axios.post(
      `${BASE_URL}/promotions/offers`,
      payload,
      getAuthHeaders(),
    );
    return response.data;
  } catch (error) {
    throw promotionError(error, 'Failed to create offer');
  }
}

export async function updatePromotionOfferAPI(id, payload) {
  try {
    const response = await axios.put(
      `${BASE_URL}/promotions/offers/${id}`,
      payload,
      getAuthHeaders(),
    );
    return response.data;
  } catch (error) {
    throw promotionError(error, 'Failed to update offer');
  }
}

export async function archivePromotionOfferAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/promotions/offers/${id}`,
      getAuthHeaders(),
    );
    return response.data;
  } catch (error) {
    throw promotionError(error, 'Failed to archive offer');
  }
}

export async function previewPromotionAPI({
  productId,
  paidQuantity,
  billType,
  quantityUnit,
  companyId,
  discountPercentage,
  batchId,
  batchAllocations,
  priceGroupKey,
  priceGroup,
  useProductSalesPrice,
}) {
  try {
    const response = await axios.get(`${BASE_URL}/promotions/preview`, {
      params: {
        productId,
        paidQuantity,
        billType,
        quantityUnit,
        companyId,
        discountPercentage,
        ...(batchId !== undefined && { batchId }),
        ...(priceGroupKey && { priceGroupKey }),
        ...(priceGroup && { priceGroup: JSON.stringify(priceGroup) }),
        ...(useProductSalesPrice && { useProductSalesPrice: true }),
        ...(batchAllocations?.length && {
          batchAllocations: JSON.stringify(batchAllocations),
        }),
      },
      ...getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw promotionError(error, 'Failed to preview promotion');
  }
}
