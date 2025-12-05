"""
Database Setup Script
Helps set up the database connection and create initial data
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_backend.settings')
django.setup()

from inventory.models import Employee, Product, Inventory
from django.contrib.auth import hashers

def create_admin_user():
    """Create an admin user if it doesn't exist"""
    username = input("Enter admin username (default: admin): ").strip() or "admin"
    email = input("Enter admin email (optional): ").strip() or ""
    password = input("Enter admin password: ").strip()
    
    if not password:
        print("Password is required!")
        return None
    
    # Check if user exists
    if Employee.objects.filter(username=username).exists():
        print(f"User '{username}' already exists!")
        update = input("Update role to Admin? (y/n): ").strip().lower()
        if update == 'y':
            user = Employee.objects.get(username=username)
            user.role = 'Admin'
            user.set_password(password)
            user.save()
            print(f"User '{username}' updated to Admin role!")
            return user
        return None
    
    # Create new admin user
    user = Employee.objects.create_user(
        username=username,
        email=email,
        password=password,
        role='Admin'
    )
    print(f"Admin user '{username}' created successfully!")
    return user

def create_sample_products():
    """Create sample products for testing"""
    sample_products = [
        {
            'sku': 'PROD001',
            'name': 'Sample Product 1',
            'unit_price': 10.00,
            'cost': 7.00,
            'category': 'Electronics',
            'stock': 50
        },
        {
            'sku': 'PROD002',
            'name': 'Sample Product 2',
            'unit_price': 25.50,
            'cost': 18.00,
            'category': 'Food',
            'stock': 30
        },
        {
            'sku': 'PROD003',
            'name': 'Sample Product 3',
            'unit_price': 5.00,
            'cost': 3.50,
            'category': 'Accessories',
            'stock': 100
        },
    ]
    
    created = []
    for prod_data in sample_products:
        if Product.objects.filter(sku=prod_data['sku']).exists():
            print(f"Product {prod_data['sku']} already exists, skipping...")
            continue
        
        product = Product.objects.create(
            sku=prod_data['sku'],
            name=prod_data['name'],
            unit_price=prod_data['unit_price'],
            cost=prod_data['cost'],
            category=prod_data['category']
        )
        
        Inventory.objects.create(
            product=product,
            stock_quantity=prod_data['stock']
        )
        
        created.append(product)
        print(f"Created product: {product.name} (SKU: {product.sku})")
    
    return created

def main():
    print("=" * 50)
    print("POS System Database Setup")
    print("=" * 50)
    print()
    
    # Check database connection
    try:
        from django.db import connection
        connection.ensure_connection()
        print("✓ Database connection successful!")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        print("\nPlease check your .env file and PostgreSQL settings.")
        return
    
    print()
    
    # Create admin user
    print("Step 1: Create Admin User")
    print("-" * 30)
    create_admin = input("Create admin user? (y/n): ").strip().lower()
    if create_admin == 'y':
        create_admin_user()
    print()
    
    # Create sample products
    print("Step 2: Create Sample Products")
    print("-" * 30)
    create_samples = input("Create sample products? (y/n): ").strip().lower()
    if create_samples == 'y':
        create_sample_products()
    print()
    
    print("=" * 50)
    print("Setup complete!")
    print("=" * 50)
    print("\nYou can now:")
    print("1. Start the server: python manage.py runserver")
    print("2. Login at: http://localhost:8000/admin")
    print("3. Or use the POS interface at: http://localhost:3000")

if __name__ == '__main__':
    main()


