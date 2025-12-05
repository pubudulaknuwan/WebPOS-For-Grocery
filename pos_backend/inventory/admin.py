"""
Django Admin Configuration for Inventory Models
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from inventory.models import Employee, Product, Inventory


@admin.register(Employee)
class EmployeeAdmin(BaseUserAdmin):
    """Admin interface for Employee model"""
    list_display = ['username', 'email', 'role', 'is_staff', 'date_joined']
    list_filter = ['role', 'is_staff', 'is_superuser']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('POS Role', {'fields': ('role',)}),
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin interface for Product model"""
    list_display = ['sku', 'name', 'unit_price', 'cost', 'category', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['sku', 'name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    """Admin interface for Inventory model"""
    list_display = ['product', 'stock_quantity', 'last_updated']
    list_filter = ['last_updated']
    search_fields = ['product__sku', 'product__name']
    readonly_fields = ['last_updated']


