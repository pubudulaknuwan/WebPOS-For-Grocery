"""
Django Models for POS System - Inventory Management
Contains Employee, Product, Inventory, Transaction, and TransactionItem models
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from decimal import Decimal


class Employee(AbstractUser):
    """
    Employee model extending Django's AbstractUser
    Stores user accounts for cashiers and admins
    """
    ROLE_CHOICES = [
        ('Cashier', 'Cashier'),
        ('Admin', 'Admin'),
    ]
    
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='Cashier',
        help_text="Employee role: Cashier or Admin"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Employee"
        verbose_name_plural = "Employees"
        ordering = ['username']
    
    def __str__(self):
        return f"{self.username} ({self.role})"


class Product(models.Model):
    """
    Product model - Basic product information
    Stores SKU, name, pricing, and category
    """
    sku = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Stock Keeping Unit - Unique product identifier"
    )
    name = models.CharField(
        max_length=200,
        help_text="Product name"
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Selling price per unit"
    )
    cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Cost price per unit"
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        help_text="Product category"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ['name']
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return f"{self.name} (SKU: {self.sku})"


class Inventory(models.Model):
    """
    Inventory model - Stock levels for products
    Tracks current stock quantity and last update timestamp
    """
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='inventory',
        help_text="Associated product"
    )
    stock_quantity = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Current stock quantity"
    )
    last_updated = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of last stock update"
    )
    
    class Meta:
        verbose_name = "Inventory"
        verbose_name_plural = "Inventories"
        ordering = ['product__name']
    
    def __str__(self):
        return f"{self.product.name} - Stock: {self.stock_quantity}"
    
    def has_sufficient_stock(self, quantity):
        """Check if sufficient stock is available"""
        return self.stock_quantity >= quantity


class Transaction(models.Model):
    """
    Transaction model - Sales header information
    Stores transaction metadata: timestamp, total amount, payment method, cashier
    """
    PAYMENT_METHOD_CHOICES = [
        ('Cash', 'Cash'),
        ('Card', 'Card'),
        ('Credit', 'Credit'),
    ]
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Transaction timestamp"
    )
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total transaction amount"
    )
    payment_method = models.CharField(
        max_length=10,
        choices=PAYMENT_METHOD_CHOICES,
        help_text="Payment method used"
    )
    cash_received = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Cash amount received from customer (for Cash payments)"
    )
    change_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Change given to customer (for Cash payments)"
    )
    subtotal_before_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Subtotal before any discounts"
    )
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Transaction-level discount percentage (0-100)"
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Transaction-level fixed discount amount"
    )
    total_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Total discount applied (sum of all discounts)"
    )
    cashier = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='transactions',
        help_text="Employee who processed the transaction"
    )
    
    class Meta:
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['cashier']),
        ]
    
    def __str__(self):
        return f"Transaction #{self.id} - {self.total_amount} ({self.payment_method}) - {self.timestamp}"


class TransactionItem(models.Model):
    """
    TransactionItem model - Line items for each transaction
    Stores individual product sales within a transaction
    """
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name='items',
        help_text="Parent transaction"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='transaction_items',
        help_text="Product sold"
    )
    quantity = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Quantity sold"
    )
    unit_price_at_sale = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Unit price at time of sale (snapshot)"
    )
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Discount percentage applied to this item (0-100)"
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Fixed discount amount applied to this item"
    )
    
    class Meta:
        verbose_name = "Transaction Item"
        verbose_name_plural = "Transaction Items"
        ordering = ['transaction', 'id']
        indexes = [
            models.Index(fields=['transaction']),
            models.Index(fields=['product']),
        ]
    
    def __str__(self):
        return f"{self.product.name} x{self.quantity} @ {self.unit_price_at_sale}"
    
    @property
    def subtotal(self):
        """Calculate line item subtotal before discount"""
        return self.quantity * self.unit_price_at_sale
    
    @property
    def item_discount(self):
        """Calculate discount for this item"""
        base_subtotal = self.quantity * self.unit_price_at_sale
        percentage_discount = base_subtotal * (self.discount_percentage / Decimal('100'))
        fixed_discount = self.discount_amount
        return percentage_discount + fixed_discount
    
    @property
    def final_subtotal(self):
        """Calculate final subtotal after discount"""
        return (self.quantity * self.unit_price_at_sale) - self.item_discount

