"""
Quick script to create admin user
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_backend.settings')
django.setup()

from inventory.models import Employee

# Create admin user
username = 'admin'
password = 'admin123'
email = 'admin@pos.com'

if Employee.objects.filter(username=username).exists():
    user = Employee.objects.get(username=username)
    user.set_password(password)
    user.role = 'Admin'
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print(f"✓ Updated existing user '{username}' to Admin role")
else:
    user = Employee.objects.create_user(
        username=username,
        email=email,
        password=password,
        role='Admin'
    )
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print(f"✓ Created admin user: {username}")
    print(f"  Password: {password}")

print("\n" + "="*50)
print("Admin user created successfully!")
print("="*50)
print(f"\nUsername: {username}")
print(f"Password: {password}")
print(f"Role: Admin")
print("\nYou can now login at:")
print("  - Django Admin: http://localhost:8000/admin")
print("  - POS System: http://localhost:3000")


