"""
Django REST Framework Serializers for Transaction API
"""

from decimal import Decimal
from rest_framework import serializers
from inventory.models import Product, Transaction, TransactionItem, Inventory, Employee


class TransactionItemSerializer(serializers.ModelSerializer):
    """Serializer for transaction line items"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    subtotal = serializers.SerializerMethodField()
    discount_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    item_discount = serializers.SerializerMethodField()
    base_subtotal = serializers.SerializerMethodField()
    
    class Meta:
        model = TransactionItem
        fields = ['id', 'product', 'product_name', 'product_sku', 'quantity', 
                 'unit_price_at_sale', 'subtotal', 'base_subtotal', 
                 'discount_percentage', 'discount_amount', 'item_discount']
        read_only_fields = ['unit_price_at_sale', 'subtotal']
    
    def get_base_subtotal(self, obj):
        """Calculate base subtotal before discount"""
        return float(obj.quantity * obj.unit_price_at_sale)
    
    def get_item_discount(self, obj):
        """Calculate total discount for this item"""
        base_subtotal = obj.quantity * obj.unit_price_at_sale
        discount_pct = obj.discount_percentage or Decimal('0.00')
        discount_amt = obj.discount_amount or Decimal('0.00')
        percentage_discount = base_subtotal * (discount_pct / Decimal('100'))
        return float(percentage_discount + discount_amt)
    
    def get_subtotal(self, obj):
        """Calculate line item subtotal after discount"""
        base_subtotal = obj.quantity * obj.unit_price_at_sale
        discount_pct = obj.discount_percentage or Decimal('0.00')
        discount_amt = obj.discount_amount or Decimal('0.00')
        percentage_discount = base_subtotal * (discount_pct / Decimal('100'))
        item_discount = percentage_discount + discount_amt
        return float(max(Decimal('0.01'), base_subtotal - item_discount))


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for transaction with nested items"""
    items = TransactionItemSerializer(many=True, read_only=True)
    cashier_username = serializers.CharField(source='cashier.username', read_only=True)
    
    class Meta:
        model = Transaction
        fields = ['id', 'timestamp', 'total_amount', 'payment_method', 
                 'cashier', 'cashier_username', 'items']
        read_only_fields = ['id', 'timestamp', 'total_amount']


class ReceiptSerializer(serializers.ModelSerializer):
    """Serializer for receipt generation with all necessary details"""
    items = TransactionItemSerializer(many=True, read_only=True)
    cashier_username = serializers.CharField(source='cashier.username', read_only=True)
    cashier_role = serializers.CharField(source='cashier.role', read_only=True)
    subtotal = serializers.SerializerMethodField()
    tax_amount = serializers.SerializerMethodField()
    tax_rate = serializers.SerializerMethodField()
    formatted_timestamp = serializers.SerializerMethodField()
    formatted_date = serializers.SerializerMethodField()
    formatted_time = serializers.SerializerMethodField()
    
    subtotal_before_discount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_discount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'timestamp', 'formatted_timestamp', 'formatted_date', 'formatted_time',
            'total_amount', 'subtotal', 'subtotal_before_discount', 'total_discount',
            'tax_amount', 'tax_rate',
            'payment_method', 'cash_received', 'change_amount',
            'cashier_username', 'cashier_role', 'items'
        ]
        read_only_fields = ['id', 'timestamp', 'total_amount']
    
    def get_subtotal(self, obj):
        """Calculate subtotal after discounts (total_amount - tax)"""
        # Assuming 5% tax rate for Dubai
        from decimal import Decimal
        tax_rate = Decimal('0.05')
        subtotal = obj.total_amount / (Decimal('1') + tax_rate)
        return float(round(subtotal, 2))
    
    def get_tax_amount(self, obj):
        """Calculate tax amount"""
        from decimal import Decimal
        tax_rate = Decimal('0.05')
        subtotal = obj.total_amount / (Decimal('1') + tax_rate)
        tax = obj.total_amount - subtotal
        return float(round(tax, 2))
    
    def get_tax_rate(self, obj):
        """Get tax rate as percentage"""
        return float(5.0)  # 5% VAT for Dubai
    
    def get_formatted_timestamp(self, obj):
        """Format timestamp for receipt"""
        return obj.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    
    def get_formatted_date(self, obj):
        """Format date for receipt"""
        return obj.timestamp.strftime('%B %d, %Y')
    
    def get_formatted_time(self, obj):
        """Format time for receipt"""
        return obj.timestamp.strftime('%I:%M %p')


class TransactionCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a new transaction
    Accepts product IDs, quantities, and payment method
    """
    items = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of items with 'product_id' and 'quantity'"
    )
    payment_method = serializers.ChoiceField(
        choices=Transaction.PAYMENT_METHOD_CHOICES,
        help_text="Payment method: Cash, Card, or Credit"
    )
    cash_received = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text="Cash amount received (required for Cash payments)"
    )
    change_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text="Change amount (calculated automatically, optional)"
    )
    # Transaction-level discounts
    discount_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        default=Decimal('0.00'),
        help_text="Transaction-level discount percentage (0-100)"
    )
    discount_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        default=Decimal('0.00'),
        help_text="Transaction-level fixed discount amount"
    )
    
    def validate_items(self, value):
        """Validate that items list is not empty"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("Items list cannot be empty")
        return value
    
    def validate(self, attrs):
        """Validate product IDs and quantities"""
        items = attrs['items']
        payment_method = attrs.get('payment_method')
        cash_received = attrs.get('cash_received')
        
        # Validate each item has required fields
        for item in items:
            if 'product_id' not in item:
                raise serializers.ValidationError("Each item must have 'product_id'")
            if 'quantity' not in item:
                raise serializers.ValidationError("Each item must have 'quantity'")
            
            quantity = item['quantity']
            if not isinstance(quantity, int) or quantity <= 0:
                raise serializers.ValidationError("Quantity must be a positive integer")
            
            # Validate item-level discounts if provided
            if 'discount_percentage' in item and item['discount_percentage'] is not None:
                try:
                    disc_pct = Decimal(str(item['discount_percentage']))
                    if disc_pct < Decimal('0') or disc_pct > Decimal('100'):
                        raise serializers.ValidationError("Item discount percentage must be between 0 and 100")
                except (ValueError, TypeError):
                    raise serializers.ValidationError("Item discount percentage must be a valid number")
            if 'discount_amount' in item and item['discount_amount'] is not None:
                try:
                    disc_amt = Decimal(str(item['discount_amount']))
                    if disc_amt < Decimal('0'):
                        raise serializers.ValidationError("Item discount amount cannot be negative")
                except (ValueError, TypeError):
                    raise serializers.ValidationError("Item discount amount must be a valid number")
        
        # Validate transaction-level discounts
        discount_percentage = attrs.get('discount_percentage')
        discount_amount = attrs.get('discount_amount')
        
        if discount_percentage is not None:
            try:
                discount_percentage = Decimal(str(discount_percentage))
                if discount_percentage < Decimal('0') or discount_percentage > Decimal('100'):
                    raise serializers.ValidationError("Transaction discount percentage must be between 0 and 100")
            except (ValueError, TypeError):
                raise serializers.ValidationError("Transaction discount percentage must be a valid number")
        else:
            attrs['discount_percentage'] = Decimal('0.00')
        
        if discount_amount is not None:
            try:
                discount_amount = Decimal(str(discount_amount))
                if discount_amount < Decimal('0'):
                    raise serializers.ValidationError("Transaction discount amount cannot be negative")
            except (ValueError, TypeError):
                raise serializers.ValidationError("Transaction discount amount must be a valid number")
        else:
            attrs['discount_amount'] = Decimal('0.00')
        
        # Validate cash received for Cash payments
        if payment_method == 'Cash':
            if cash_received is None:
                raise serializers.ValidationError("cash_received is required for Cash payments")
            if cash_received < Decimal('0'):
                raise serializers.ValidationError("Cash received cannot be negative")
        
        return attrs
