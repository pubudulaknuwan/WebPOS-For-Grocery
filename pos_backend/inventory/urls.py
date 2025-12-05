"""
URL Configuration for Inventory/Product API
"""

from django.urls import path
from inventory.views import (
    ProductSearchAPIView,
    ProductListAPIView,
    ProductDetailAPIView,
    ProductCreateAPIView,
    InventoryUpdateAPIView,
    LowStockAlertAPIView,
    LoginAPIView
)

app_name = 'inventory'

urlpatterns = [
    path('search', ProductSearchAPIView.as_view(), name='product-search'),
    path('', ProductListAPIView.as_view(), name='product-list'),
    path('create', ProductCreateAPIView.as_view(), name='product-create'),
    path('<int:product_id>/', ProductDetailAPIView.as_view(), name='product-detail'),
    path('<int:product_id>/inventory', InventoryUpdateAPIView.as_view(), name='inventory-update'),
    path('low-stock', LowStockAlertAPIView.as_view(), name='low-stock-alert'),
]

