"""
Django REST Framework Serializers for Product/Inventory API
"""

from rest_framework import serializers
from inventory.models import Product, Inventory
from decimal import Decimal


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model"""
    stock_quantity = serializers.IntegerField(source='inventory.stock_quantity', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'sku', 'name', 'unit_price', 'cost', 'category', 'stock_quantity', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating products"""
    stock_quantity = serializers.IntegerField(write_only=True, required=False, default=0)
    
    class Meta:
        model = Product
        fields = ['sku', 'name', 'unit_price', 'cost', 'category', 'stock_quantity']
    
    def validate_sku(self, value):
        """Validate SKU is unique (except when updating)"""
        # Check if this is an update (instance exists)
        if self.instance:
            # If updating, allow same SKU
            if Product.objects.filter(sku=value).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError("A product with this SKU already exists.")
        else:
            # If creating, check if SKU exists
            if Product.objects.filter(sku=value).exists():
                raise serializers.ValidationError("A product with this SKU already exists.")
        return value
    
    def validate_unit_price(self, value):
        """Validate unit price is positive"""
        if value <= 0:
            raise serializers.ValidationError("Unit price must be greater than zero.")
        return value
    
    def validate_cost(self, value):
        """Validate cost is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Cost cannot be negative.")
        return value
    
    def create(self, validated_data):
        """Create product and inventory record"""
        stock_quantity = validated_data.pop('stock_quantity', 0)
        product = Product.objects.create(**validated_data)
        
        # Create inventory record
        Inventory.objects.create(
            product=product,
            stock_quantity=stock_quantity
        )
        
        return product
    
    def update(self, instance, validated_data):
        """Update product"""
        stock_quantity = validated_data.pop('stock_quantity', None)
        
        # Update product fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update inventory if stock_quantity provided
        if stock_quantity is not None:
            inventory, created = Inventory.objects.get_or_create(product=instance)
            inventory.stock_quantity = stock_quantity
            inventory.save()
        
        return instance


class ProductSearchSerializer(serializers.Serializer):
    """Serializer for product search by SKU"""
    sku = serializers.CharField(max_length=100, help_text="Product SKU to search")


class InventoryUpdateSerializer(serializers.Serializer):
    """Serializer for updating inventory stock"""
    stock_quantity = serializers.IntegerField(help_text="New stock quantity")
    adjustment_reason = serializers.CharField(
        max_length=200, 
        required=False, 
        allow_blank=True,
        help_text="Reason for stock adjustment"
    )
