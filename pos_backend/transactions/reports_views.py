"""
Reports and Analytics API Views
Provides sales reports, analytics, and data export functionality
"""

import logging
import csv
from decimal import Decimal
from datetime import datetime, timedelta
from django.db.models import Sum, Count, Avg, Q, F
from django.db.models.functions import TruncDate, TruncDay, TruncWeek, TruncMonth
from django.http import HttpResponse
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from inventory.models import Transaction, TransactionItem, Product, Employee

logger = logging.getLogger(__name__)


class SalesReportAPIView(APIView):
    """
    API View for generating sales reports
    Endpoint: GET /api/v1/reports/sales/
    
    Query Parameters:
    - start_date: YYYY-MM-DD (default: 30 days ago)
    - end_date: YYYY-MM-DD (default: today)
    - period: 'daily', 'weekly', 'monthly' (default: 'daily')
    - group_by: 'date', 'cashier', 'payment_method' (default: 'date')
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Generate sales report with various aggregations"""
        try:
            # Parse date parameters
            end_date = request.query_params.get('end_date')
            if end_date:
                try:
                    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    end_date = datetime.now().date()
            else:
                end_date = datetime.now().date()
            
            start_date = request.query_params.get('start_date')
            if start_date:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                except ValueError:
                    start_date = end_date - timedelta(days=30)
            else:
                start_date = end_date - timedelta(days=30)
            
            # Ensure start_date is before end_date
            if start_date > end_date:
                start_date, end_date = end_date, start_date
            
            period = request.query_params.get('period', 'daily')
            group_by = request.query_params.get('group_by', 'date')
            
            # Base queryset
            transactions = Transaction.objects.filter(
                timestamp__date__gte=start_date,
                timestamp__date__lte=end_date
            )
            
            # Calculate overall summary
            summary = transactions.aggregate(
                total_sales=Sum('total_amount'),
                total_transactions=Count('id'),
                average_transaction=Avg('total_amount'),
                cash_sales=Sum('total_amount', filter=Q(payment_method='Cash')),
                card_sales=Sum('total_amount', filter=Q(payment_method='Card')),
                credit_sales=Sum('total_amount', filter=Q(payment_method='Credit')),
            )
            
            # Group by period
            if period == 'daily':
                transactions_grouped = transactions.annotate(
                    period_date=TruncDate('timestamp')
                ).values('period_date').annotate(
                    total_sales=Sum('total_amount'),
                    transaction_count=Count('id'),
                    avg_transaction=Avg('total_amount')
                ).order_by('period_date')
            elif period == 'weekly':
                transactions_grouped = transactions.annotate(
                    period_week=TruncWeek('timestamp')
                ).values('period_week').annotate(
                    total_sales=Sum('total_amount'),
                    transaction_count=Count('id'),
                    avg_transaction=Avg('total_amount')
                ).order_by('period_week')
            elif period == 'monthly':
                transactions_grouped = transactions.annotate(
                    period_month=TruncMonth('timestamp')
                ).values('period_month').annotate(
                    total_sales=Sum('total_amount'),
                    transaction_count=Count('id'),
                    avg_transaction=Avg('total_amount')
                ).order_by('period_month')
            else:
                transactions_grouped = []
            
            # Format grouped data
            period_data = []
            for item in transactions_grouped:
                period_key = 'period_date' if period == 'daily' else ('period_week' if period == 'weekly' else 'period_month')
                period_data.append({
                    'period': item[period_key].strftime('%Y-%m-%d') if period == 'daily' else item[period_key].strftime('%Y-%m'),
                    'total_sales': float(item['total_sales'] or 0),
                    'transaction_count': item['transaction_count'],
                    'avg_transaction': float(item['avg_transaction'] or 0)
                })
            
            # Group by additional criteria if requested
            group_by_data = {}
            if group_by == 'cashier':
                cashier_stats = transactions.values(
                    'cashier__id', 'cashier__username'
                ).annotate(
                    total_sales=Sum('total_amount'),
                    transaction_count=Count('id'),
                    avg_transaction=Avg('total_amount')
                ).order_by('-total_sales')
                
                group_by_data['cashier'] = [
                    {
                        'cashier_id': item['cashier__id'],
                        'cashier_name': item['cashier__username'],
                        'total_sales': float(item['total_sales'] or 0),
                        'transaction_count': item['transaction_count'],
                        'avg_transaction': float(item['avg_transaction'] or 0)
                    }
                    for item in cashier_stats
                ]
            
            elif group_by == 'payment_method':
                payment_stats = transactions.values('payment_method').annotate(
                    total_sales=Sum('total_amount'),
                    transaction_count=Count('id'),
                    avg_transaction=Avg('total_amount')
                ).order_by('-total_sales')
                
                group_by_data['payment_method'] = [
                    {
                        'payment_method': item['payment_method'],
                        'total_sales': float(item['total_sales'] or 0),
                        'transaction_count': item['transaction_count'],
                        'avg_transaction': float(item['avg_transaction'] or 0)
                    }
                    for item in payment_stats
                ]
            
            # Format summary
            formatted_summary = {
                'total_sales': float(summary['total_sales'] or 0),
                'total_transactions': summary['total_transactions'] or 0,
                'average_transaction': float(summary['average_transaction'] or 0),
                'cash_sales': float(summary['cash_sales'] or 0),
                'card_sales': float(summary['card_sales'] or 0),
                'credit_sales': float(summary['credit_sales'] or 0),
            }
            
            return Response({
                'success': True,
                'report': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'period': period,
                    'summary': formatted_summary,
                    'period_data': period_data,
                    'group_by_data': group_by_data
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error generating sales report: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Error generating report: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TopProductsReportAPIView(APIView):
    """
    API View for top-selling products report
    Endpoint: GET /api/v1/reports/top-products/
    
    Query Parameters:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - limit: Number of top products to return (default: 10)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get top-selling products"""
        try:
            # Parse date parameters
            end_date = request.query_params.get('end_date')
            if end_date:
                try:
                    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    end_date = datetime.now().date()
            else:
                end_date = datetime.now().date()
            
            start_date = request.query_params.get('start_date')
            if start_date:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                except ValueError:
                    start_date = end_date - timedelta(days=30)
            else:
                start_date = end_date - timedelta(days=30)
            
            limit = int(request.query_params.get('limit', 10))
            
            # Get top products by quantity sold
            top_products = TransactionItem.objects.filter(
                transaction__timestamp__date__gte=start_date,
                transaction__timestamp__date__lte=end_date
            ).values(
                'product__id',
                'product__name',
                'product__sku',
                'product__unit_price'
            ).annotate(
                total_quantity=Sum('quantity'),
                total_revenue=Sum(F('quantity') * F('unit_price_at_sale')),
                transaction_count=Count('transaction', distinct=True)
            ).order_by('-total_quantity')[:limit]
            
            products_data = []
            for item in top_products:
                products_data.append({
                    'product_id': item['product__id'],
                    'product_name': item['product__name'],
                    'product_sku': item['product__sku'],
                    'unit_price': float(item['product__unit_price']),
                    'total_quantity_sold': item['total_quantity'],
                    'total_revenue': float(item['total_revenue'] or 0),
                    'transaction_count': item['transaction_count']
                })
            
            return Response({
                'success': True,
                'report': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'top_products': products_data
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error generating top products report: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Error generating report: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CashierPerformanceAPIView(APIView):
    """
    API View for cashier performance report
    Endpoint: GET /api/v1/reports/cashier-performance/
    
    Query Parameters:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - cashier_id: Filter by specific cashier (optional)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get cashier performance metrics"""
        try:
            # Parse date parameters
            end_date = request.query_params.get('end_date')
            if end_date:
                try:
                    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    end_date = datetime.now().date()
            else:
                end_date = datetime.now().date()
            
            start_date = request.query_params.get('start_date')
            if start_date:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                except ValueError:
                    start_date = end_date - timedelta(days=30)
            else:
                start_date = end_date - timedelta(days=30)
            
            cashier_id = request.query_params.get('cashier_id')
            
            # Base queryset
            transactions = Transaction.objects.filter(
                timestamp__date__gte=start_date,
                timestamp__date__lte=end_date
            )
            
            if cashier_id:
                transactions = transactions.filter(cashier_id=cashier_id)
            
            # Get cashier performance
            cashier_performance = transactions.values(
                'cashier__id',
                'cashier__username',
                'cashier__first_name',
                'cashier__last_name'
            ).annotate(
                total_sales=Sum('total_amount'),
                transaction_count=Count('id'),
                avg_transaction=Avg('total_amount'),
                cash_transactions=Count('id', filter=Q(payment_method='Cash')),
                card_transactions=Count('id', filter=Q(payment_method='Card')),
                credit_transactions=Count('id', filter=Q(payment_method='Credit'))
            ).order_by('-total_sales')
            
            performance_data = []
            for item in cashier_performance:
                full_name = f"{item['cashier__first_name'] or ''} {item['cashier__last_name'] or ''}".strip()
                if not full_name:
                    full_name = item['cashier__username']
                
                performance_data.append({
                    'cashier_id': item['cashier__id'],
                    'cashier_username': item['cashier__username'],
                    'cashier_name': full_name,
                    'total_sales': float(item['total_sales'] or 0),
                    'transaction_count': item['transaction_count'],
                    'avg_transaction': float(item['avg_transaction'] or 0),
                    'cash_transactions': item['cash_transactions'],
                    'card_transactions': item['card_transactions'],
                    'credit_transactions': item['credit_transactions']
                })
            
            return Response({
                'success': True,
                'report': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'performance': performance_data
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error generating cashier performance report: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Error generating report: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExportSalesReportAPIView(APIView):
    """
    API View for exporting sales report to CSV
    Endpoint: GET /api/v1/reports/export-sales/
    
    Query Parameters:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - format: 'csv' (default)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Export sales report to CSV"""
        try:
            # Parse date parameters
            end_date = request.query_params.get('end_date')
            if end_date:
                try:
                    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    end_date = datetime.now().date()
            else:
                end_date = datetime.now().date()
            
            start_date = request.query_params.get('start_date')
            if start_date:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                except ValueError:
                    start_date = end_date - timedelta(days=30)
            else:
                start_date = end_date - timedelta(days=30)
            
            # Get transactions
            transactions = Transaction.objects.filter(
                timestamp__date__gte=start_date,
                timestamp__date__lte=end_date
            ).select_related('cashier').prefetch_related('items').order_by('-timestamp')
            
            # Create CSV response
            response = HttpResponse(content_type='text/csv')
            filename = f'sales_report_{start_date}_{end_date}.csv'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            writer = csv.writer(response)
            
            # Write header
            writer.writerow([
                'Transaction ID',
                'Date',
                'Time',
                'Cashier',
                'Payment Method',
                'Cash Received',
                'Change',
                'Total Amount',
                'Item Count'
            ])
            
            # Write data
            for transaction in transactions:
                writer.writerow([
                    transaction.id,
                    transaction.timestamp.strftime('%Y-%m-%d'),
                    transaction.timestamp.strftime('%H:%M:%S'),
                    transaction.cashier.username,
                    transaction.payment_method,
                    float(transaction.cash_received) if transaction.cash_received else '',
                    float(transaction.change_amount) if transaction.change_amount else '',
                    float(transaction.total_amount),
                    transaction.items.count()
                ])
            
            return response
            
        except Exception as e:
            logger.error(f"Error exporting sales report: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Error exporting report: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

