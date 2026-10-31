"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getProduct, listProductCategories, listProducts, productKeys } from "@/lib/api/products";
import type { ProductListParams } from "@/types/product";

export const useProductList = (params: ProductListParams, enabled = true) =>
  useQuery({
    queryKey: productKeys.list(params),
    queryFn: ({ signal }) => listProducts(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useProduct = (id: string) =>
  useQuery({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => getProduct(id, signal),
  });

export const useProductCategories = () =>
  useQuery({
    queryKey: productKeys.categories,
    queryFn: ({ signal }) => listProductCategories(signal),
  });
