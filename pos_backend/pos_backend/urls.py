"""
Main URL Configuration for POS Backend
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from inventory.views import LoginAPIView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/login', LoginAPIView.as_view(), name='login'),
    path('api/v1/auth/refresh', TokenRefreshView.as_view(), name='token-refresh'),
    path('api/v1/transactions/', include('transactions.urls')),
    path('api/v1/products/', include('inventory.urls')),
]

