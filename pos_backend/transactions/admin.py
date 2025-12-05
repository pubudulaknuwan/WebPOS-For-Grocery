"""
Django Admin Configuration for Transaction Models
"""

from django.contrib import admin
from inventory.models import Transaction, TransactionItem


class TransactionItemInline(admin.TabularInline):
    """Inline admin for TransactionItem"""
    model = TransactionItem
    extra = 0
    readonly_fields = ['product', 'quantity', 'unit_price_at_sale']
    can_delete = False


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    """Admin interface for Transaction model"""
    list_display = ['id', 'timestamp', 'total_amount', 'payment_method', 'cashier', 'item_count']
    list_filter = ['payment_method', 'timestamp', 'cashier']
    search_fields = ['id', 'cashier__username']
    readonly_fields = ['timestamp']
    inlines = [TransactionItemInline]
    date_hierarchy = 'timestamp'
    
    def item_count(self, obj):
        """Display number of items in transaction"""
        return obj.items.count()
    item_count.short_description = 'Items'

