"""
Django REST Framework Views for Transaction API
Implements atomic transaction creation with stock validation and updates
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction as db_transaction
from django.db.models import F, Q
from decimal import Decimal
from datetime import datetime, timedelta
from django.conf import settings

from inventory.models import Product, Transaction, TransactionItem, Inventory
from transactions.serializers import (
    TransactionCreateSerializer, 
    TransactionSerializer,
    ReceiptSerializer
)

logger = logging.getLogger(__name__)


class TransactionCreateAPIView(APIView):
    """
    API View for creating a new transaction
    Endpoint: POST /api/v1/transactions/new
    
    This view handles complete sale processing with atomic operations:
    1. Validates stock availability for all items
    2. Creates Transaction record
    3. Creates all TransactionItem records
    4. Decrements stock quantities in Inventory
    5. Rolls back entire operation if any step fails
    """
    permission_classes = [IsAuthenticated]
    
    @db_transaction.atomic
    def post(self, request):
        """
        Create a new transaction atomically
        
        Request Body:
        {
            "items": [
                {"product_id": 1, "quantity": 2},
                {"product_id": 3, "quantity": 1}
            ],
            "payment_method": "Cash",
            "cash_received": 50.00,
            "change_amount": 10.00
        }
        
        Returns:
        {
            "success": true,
            "transaction_id": 123,
            "message": "Transaction completed successfully",
            "transaction": {...}
        }
        """
        try:
            logger.info(f"Transaction creation request received: {request.data}")
            serializer = TransactionCreateSerializer(data=request.data)
            
            if not serializer.is_valid():
                logger.warning(f"Serializer validation failed: {serializer.errors}")
                logger.warning(f"Request data: {request.data}")
                return Response(
                    {
                        "success": False,
                        "errors": serializer.errors,
                        "message": f"Invalid request data: {serializer.errors}",
                        "request_data": request.data
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            logger.error(f"Error in transaction creation setup: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "message": f"Error processing request: {str(e)}"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        items_data = serializer.validated_data['items']
        payment_method = serializer.validated_data['payment_method']
        cash_received = serializer.validated_data.get('cash_received')
        change_amount = serializer.validated_data.get('change_amount')
        transaction_discount_percentage = serializer.validated_data.get('discount_percentage', Decimal('0.00'))
        transaction_discount_amount = serializer.validated_data.get('discount_amount', Decimal('0.00'))
        cashier = request.user
        
        # Step 1: Validate stock availability for all items
        product_stock_map = {}
        products_to_fetch = []
        
        for item in items_data:
            product_id = item['product_id']
            quantity = item['quantity']
            
            try:
                product = Product.objects.select_related('inventory').get(id=product_id)
                products_to_fetch.append((product, quantity))
                
                # Check if inventory exists
                try:
                    inventory = product.inventory
                except Inventory.DoesNotExist:
                    return Response(
                        {
                            "success": False,
                            "message": f"Inventory record not found for product: {product.name}",
                            "product_id": product_id
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check stock availability
                if not inventory.has_sufficient_stock(quantity):
                    return Response(
                        {
                            "success": False,
                            "message": f"Insufficient stock for product: {product.name}",
                            "product_id": product_id,
                            "requested": quantity,
                            "available": inventory.stock_quantity
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Get item-level discounts if provided
                item_discount_percentage = Decimal(str(item.get('discount_percentage', 0)))
                item_discount_amount = Decimal(str(item.get('discount_amount', 0)))
                
                product_stock_map[product_id] = {
                    'product': product,
                    'inventory': inventory,
                    'quantity': quantity,
                    'unit_price': product.unit_price,
                    'discount_percentage': item_discount_percentage,
                    'discount_amount': item_discount_amount
                }
                
            except Product.DoesNotExist:
                return Response(
                    {
                        "success": False,
                        "message": f"Product not found with ID: {product_id}",
                        "product_id": product_id
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Step 2: Calculate subtotal before discounts and apply item-level discounts
        subtotal_before_discount = Decimal('0.00')
        total_item_discounts = Decimal('0.00')
        
        for item_data in product_stock_map.values():
            base_subtotal = item_data['unit_price'] * item_data['quantity']
            subtotal_before_discount += base_subtotal
            
            # Calculate item-level discount
            item_discount_pct = item_data.get('discount_percentage', Decimal('0.00'))
            item_discount_amt = item_data.get('discount_amount', Decimal('0.00'))
            
            percentage_discount = base_subtotal * (item_discount_pct / Decimal('100'))
            item_total_discount = percentage_discount + item_discount_amt
            
            # Store discount for later use
            item_data['item_discount'] = item_total_discount
            total_item_discounts += item_total_discount
        
        # Step 3: Apply transaction-level discounts
        subtotal_after_item_discounts = subtotal_before_discount - total_item_discounts
        transaction_percentage_discount = subtotal_after_item_discounts * (transaction_discount_percentage / Decimal('100'))
        transaction_total_discount = transaction_percentage_discount + transaction_discount_amount
        
        # Calculate final total
        total_discount = total_item_discounts + transaction_total_discount
        total_amount = subtotal_after_item_discounts - transaction_total_discount
        
        # Ensure total is not negative
        if total_amount < Decimal('0.01'):
            total_amount = Decimal('0.01')
        
        # Step 4: Calculate change for cash payments
        if payment_method == 'Cash' and cash_received is not None:
            cash_received_decimal = Decimal(str(cash_received))
            if change_amount is None:
                # Auto-calculate change if not provided
                change_amount = cash_received_decimal - total_amount
                if change_amount < Decimal('0'):
                    return Response(
                        {
                            "success": False,
                            "message": f"Insufficient cash received. Total is {total_amount}, but only {cash_received_decimal} received."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                change_amount = Decimal(str(change_amount))
            # Use the Decimal value for cash_received
            cash_received = cash_received_decimal
        else:
            cash_received = None
            change_amount = None
        
        # Step 5: Create Transaction record
        try:
            transaction = Transaction.objects.create(
                total_amount=total_amount,
                payment_method=payment_method,
                cash_received=cash_received,
                change_amount=change_amount,
                subtotal_before_discount=subtotal_before_discount,
                discount_percentage=transaction_discount_percentage,
                discount_amount=transaction_discount_amount,
                total_discount=total_discount,
                cashier=cashier
            )
        except Exception as e:
            logger.error(f"Error creating transaction record: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "message": f"Failed to create transaction: {str(e)}"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Step 6: Create TransactionItem records and decrement stock
        transaction_items = []
        
        try:
            for product_id, item_data in product_stock_map.items():
                product = item_data['product']
                inventory = item_data['inventory']
                quantity = item_data['quantity']
                unit_price = item_data['unit_price']
                item_discount_pct = item_data.get('discount_percentage', Decimal('0.00'))
                item_discount_amt = item_data.get('discount_amount', Decimal('0.00'))
                
                # Create transaction item with discounts
                transaction_item = TransactionItem.objects.create(
                    transaction=transaction,
                    product=product,
                    quantity=quantity,
                    unit_price_at_sale=unit_price,
                    discount_percentage=item_discount_pct,
                    discount_amount=item_discount_amt
                )
                transaction_items.append(transaction_item)
                
                # Decrement stock quantity atomically using F() to prevent race conditions
                # This ensures thread-safe stock updates
                inventory.stock_quantity = F('stock_quantity') - quantity
                inventory.save(update_fields=['stock_quantity'])
                
        except Exception as e:
            # If any error occurs, the @db_transaction.atomic decorator
            # will automatically rollback all database changes
            logger.error(f"Error processing transaction items: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "message": f"Failed to process transaction items: {str(e)}",
                    "transaction_id": transaction.id if transaction else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Step 6: Refresh inventory objects to get updated stock quantities
        # (F() expressions need refresh to see actual values)
        for item_data in product_stock_map.values():
            item_data['inventory'].refresh_from_db()
        
        # Step 7: Serialize and return success response
        try:
            transaction_serializer = TransactionSerializer(transaction)
            
            return Response(
                {
                    "success": True,
                    "transaction_id": transaction.id,
                    "message": "Transaction completed successfully",
                    "transaction": transaction_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f"Error serializing transaction response: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "message": f"Transaction created but error serializing response: {str(e)}",
                    "transaction_id": transaction.id if transaction else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TransactionListAPIView(APIView):
    """
    API View for listing transactions
    Endpoint: GET /api/v1/transactions/
    
    Supports filtering by date range, cashier, and payment method
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get list of transactions with optional filters
        
        Query Parameters:
        - start_date: YYYY-MM-DD format
        - end_date: YYYY-MM-DD format
        - cashier_id: Filter by cashier ID
        - payment_method: Filter by payment method
        - page: Page number for pagination
        - limit: Items per page (default: 50)
        """
        transactions = Transaction.objects.select_related('cashier').prefetch_related('items').all()
        
        # Apply filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        cashier_id = request.query_params.get('cashier_id')
        payment_method = request.query_params.get('payment_method')
        
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                transactions = transactions.filter(timestamp__gte=start)
            except ValueError:
                pass
        
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d')
                # Include the entire end date
                end = end + timedelta(days=1)
                transactions = transactions.filter(timestamp__lt=end)
            except ValueError:
                pass
        
        if cashier_id:
            transactions = transactions.filter(cashier_id=cashier_id)
        
        if payment_method:
            transactions = transactions.filter(payment_method=payment_method)
        
        # Order by most recent first
        transactions = transactions.order_by('-timestamp')
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 50))
        offset = (page - 1) * limit
        
        total_count = transactions.count()
        transactions = transactions[offset:offset + limit]
        
        # Serialize transactions
        serializer = TransactionSerializer(transactions, many=True)
        
        return Response(
            {
                "success": True,
                "count": total_count,
                "page": page,
                "limit": limit,
                "transactions": serializer.data
            },
            status=status.HTTP_200_OK
        )


class TransactionDetailAPIView(APIView):
    """
    API View for retrieving a single transaction
    Endpoint: GET /api/v1/transactions/<id>/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, transaction_id):
        """Get transaction details by ID"""
        try:
            transaction = Transaction.objects.select_related('cashier').prefetch_related('items__product').get(id=transaction_id)
            serializer = TransactionSerializer(transaction)
            
            return Response(
                {
                    "success": True,
                    "transaction": serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Transaction.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Transaction not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )


class ReceiptAPIView(APIView):
    """
    API View for generating receipt data
    Endpoint: GET /api/v1/transactions/<id>/receipt
    Returns formatted receipt data for printing
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, transaction_id):
        """Get receipt data for a transaction"""
        try:
            transaction = Transaction.objects.select_related('cashier').prefetch_related('items__product').get(id=transaction_id)
            
            try:
                serializer = ReceiptSerializer(transaction)
                receipt_serialized = serializer.data
            except Exception as e:
                # If serializer fails, return error
                import traceback
                return Response(
                    {
                        "success": False,
                        "message": f"Error serializing receipt: {str(e)}",
                        "error_details": traceback.format_exc()
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Add company information from settings
            try:
                from pos_backend.receipt_settings import RECEIPT_COMPANY_INFO, RECEIPT_SETTINGS
                company_info = RECEIPT_COMPANY_INFO
                receipt_settings = RECEIPT_SETTINGS
            except ImportError:
                # Fallback if settings file doesn't exist
                company_info = {
                    'name': 'DilmaSuperPOS',
                    'address': 'Dubai, UAE',
                    'phone': '+971 XX XXX XXXX',
                    'email': 'info@supermarket.ae',
                    'tax_id': 'VAT: 123456789',
                }
                receipt_settings = {
                    'tax_rate': 0.05,
                    'currency': 'AED',
                }
            
            receipt_data = {
                "success": True,
                "receipt": receipt_serialized,
                "company": company_info,
                "settings": receipt_settings
            }
            
            return Response(receipt_data, status=status.HTTP_200_OK)
        except Transaction.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Transaction not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            # Catch any other errors
            import traceback
            return Response(
                {
                    "success": False,
                    "message": f"Error generating receipt: {str(e)}",
                    "error_details": traceback.format_exc()
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
