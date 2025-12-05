"""
Django REST Framework Views for Product/Inventory API
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Q
from inventory.models import Product, Inventory, Employee
from inventory.serializers import (
    ProductSerializer, 
    ProductSearchSerializer,
    ProductCreateUpdateSerializer,
    InventoryUpdateSerializer
)


class ProductSearchAPIView(APIView):
    """
    API View for searching products by SKU
    Endpoint: GET /api/v1/products/search?sku=ABC123
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Search product by SKU"""
        serializer = ProductSearchSerializer(data=request.query_params)
        
        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "errors": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sku = serializer.validated_data['sku']
        
        try:
            product = Product.objects.select_related('inventory').get(sku=sku)
            product_serializer = ProductSerializer(product)
            
            return Response(
                {
                    "success": True,
                    "product": product_serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Product.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": f"Product not found with SKU: {sku}"
                },
                status=status.HTTP_404_NOT_FOUND
            )


class ProductListAPIView(APIView):
    """
    API View for listing products
    Endpoint: GET /api/v1/products/
    Supports search and filtering
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get list of products with optional filters
        
        Query Parameters:
        - search: Search by name or SKU
        - category: Filter by category
        - low_stock: Filter products with low stock (threshold: 10)
        - page: Page number
        - limit: Items per page (default: 50)
        """
        products = Product.objects.select_related('inventory').all()
        
        # Search filter
        search = request.query_params.get('search', '').strip()
        if search:
            products = products.filter(
                Q(name__icontains=search) | Q(sku__icontains=search)
            )
        
        # Category filter
        category = request.query_params.get('category', '').strip()
        if category:
            products = products.filter(category=category)
        
        # Low stock filter
        low_stock = request.query_params.get('low_stock', '').lower() == 'true'
        if low_stock:
            products = products.filter(inventory__stock_quantity__lte=10)
        
        # Order by name
        products = products.order_by('name')
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 50))
        offset = (page - 1) * limit
        
        total_count = products.count()
        products = products[offset:offset + limit]
        
        # Serialize products
        serializer = ProductSerializer(products, many=True)
        
        return Response(
            {
                "success": True,
                "count": total_count,
                "page": page,
                "limit": limit,
                "products": serializer.data
            },
            status=status.HTTP_200_OK
        )


class ProductDetailAPIView(APIView):
    """
    API View for product CRUD operations
    Endpoints:
    - GET /api/v1/products/<id>/ - Get product details
    - PUT /api/v1/products/<id>/ - Update product
    - DELETE /api/v1/products/<id>/ - Delete product
    """
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Only admins can create/update/delete products"""
        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            # Check if user is admin
            if not self.request.user.is_authenticated or self.request.user.role != 'Admin':
                from rest_framework.permissions import IsAdminUser
                return [IsAdminUser()]
        return super().get_permissions()
    
    def get(self, request, product_id):
        """Get product details by ID"""
        try:
            product = Product.objects.select_related('inventory').get(id=product_id)
            serializer = ProductSerializer(product)
            
            return Response(
                {
                    "success": True,
                    "product": serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Product.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Product not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )
    
    def put(self, request, product_id):
        """Update product"""
        # Check admin permission
        if request.user.role != 'Admin':
            return Response(
                {
                    "success": False,
                    "message": "Only admins can update products"
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            product = Product.objects.select_related('inventory').get(id=product_id)
            serializer = ProductCreateUpdateSerializer(product, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                # Return updated product
                product_serializer = ProductSerializer(product)
                return Response(
                    {
                        "success": True,
                        "message": "Product updated successfully",
                        "product": product_serializer.data
                    },
                    status=status.HTTP_200_OK
                )
            
            return Response(
                {
                    "success": False,
                    "errors": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Product.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Product not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, product_id):
        """Delete product"""
        # Check admin permission
        if request.user.role != 'Admin':
            return Response(
                {
                    "success": False,
                    "message": "Only admins can delete products"
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            product = Product.objects.get(id=product_id)
            product.delete()
            
            return Response(
                {
                    "success": True,
                    "message": "Product deleted successfully"
                },
                status=status.HTTP_200_OK
            )
        except Product.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Product not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )


class ProductCreateAPIView(APIView):
    """
    API View for creating new products
    Endpoint: POST /api/v1/products/
    Admin only
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create a new product"""
        # Check admin permission
        if request.user.role != 'Admin':
            return Response(
                {
                    "success": False,
                    "message": "Only admins can create products"
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ProductCreateUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            product = serializer.save()
            # Return created product
            product_serializer = ProductSerializer(product)
            return Response(
                {
                    "success": True,
                    "message": "Product created successfully",
                    "product": product_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        
        return Response(
            {
                "success": False,
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class InventoryUpdateAPIView(APIView):
    """
    API View for updating inventory stock
    Endpoint: PUT /api/v1/products/<id>/inventory
    Admin only
    """
    permission_classes = [IsAuthenticated]
    
    def put(self, request, product_id):
        """Update inventory stock quantity"""
        # Check admin permission
        if request.user.role != 'Admin':
            return Response(
                {
                    "success": False,
                    "message": "Only admins can update inventory"
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            product = Product.objects.get(id=product_id)
            inventory, created = Inventory.objects.get_or_create(product=product)
            
            serializer = InventoryUpdateSerializer(data=request.data)
            if serializer.is_valid():
                inventory.stock_quantity = serializer.validated_data['stock_quantity']
                inventory.save()
                
                # Return updated product
                product_serializer = ProductSerializer(product)
                return Response(
                    {
                        "success": True,
                        "message": "Inventory updated successfully",
                        "product": product_serializer.data
                    },
                    status=status.HTTP_200_OK
                )
            
            return Response(
                {
                    "success": False,
                    "errors": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Product.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Product not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )


class LowStockAlertAPIView(APIView):
    """
    API View for getting low stock alerts
    Endpoint: GET /api/v1/products/low-stock
    Returns products with stock below threshold
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get products with low stock
        
        Query Parameters:
        - threshold: Stock threshold (default: 10)
        """
        threshold = int(request.query_params.get('threshold', 10))
        
        products = Product.objects.select_related('inventory').filter(
            inventory__stock_quantity__lte=threshold
        ).order_by('inventory__stock_quantity')
        
        serializer = ProductSerializer(products, many=True)
        
        return Response(
            {
                "success": True,
                "threshold": threshold,
                "count": products.count(),
                "products": serializer.data
            },
            status=status.HTTP_200_OK
        )


class LoginAPIView(APIView):
    """
    API View for employee login and JWT token generation
    Endpoint: POST /api/v1/auth/login
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Authenticate user and return JWT tokens
        
        Request Body:
        {
            "username": "cashier1",
            "password": "password123"
        }
        
        Returns:
        {
            "success": true,
            "access": "jwt_access_token",
            "refresh": "jwt_refresh_token",
            "user": {
                "id": 1,
                "username": "cashier1",
                "role": "Cashier"
            }
        }
        """
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {
                    "success": False,
                    "message": "Username and password are required"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            return Response(
                {
                    "success": False,
                    "message": "Invalid credentials"
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response(
            {
                "success": True,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "role": user.role
                }
            },
            status=status.HTTP_200_OK
        )
