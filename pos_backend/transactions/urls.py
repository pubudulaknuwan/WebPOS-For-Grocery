"""
URL Configuration for Transactions API
"""

from django.urls import path
from transactions.views import (
    TransactionCreateAPIView,
    TransactionListAPIView,
    TransactionDetailAPIView,
    ReceiptAPIView
)
from transactions.reports_views import (
    SalesReportAPIView,
    TopProductsReportAPIView,
    CashierPerformanceAPIView,
    ExportSalesReportAPIView
)

app_name = 'transactions'

urlpatterns = [
    path('new', TransactionCreateAPIView.as_view(), name='transaction-create'),
    path('', TransactionListAPIView.as_view(), name='transaction-list'),
    path('<int:transaction_id>/', TransactionDetailAPIView.as_view(), name='transaction-detail'),
    path('<int:transaction_id>/receipt', ReceiptAPIView.as_view(), name='transaction-receipt'),
    # Reports endpoints
    path('reports/sales', SalesReportAPIView.as_view(), name='sales-report'),
    path('reports/top-products', TopProductsReportAPIView.as_view(), name='top-products-report'),
    path('reports/cashier-performance', CashierPerformanceAPIView.as_view(), name='cashier-performance-report'),
    path('reports/export-sales', ExportSalesReportAPIView.as_view(), name='export-sales-report'),
]

