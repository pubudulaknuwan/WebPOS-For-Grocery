# DilmaSuperPOS

A comprehensive Point-of-Sale (POS) Web Application for grocery stores and supermarkets, built with Django REST Framework (backend) and React (frontend). Optimized for high-volume transactions and touchscreen use.

## Technology Stack

- **Backend**: Python Django with Django REST Framework (DRF)
- **Database**: PostgreSQL
- **Frontend**: React (Functional Components + Hooks) with Tailwind CSS
- **Authentication**: JWT Token-based authentication
- **API**: RESTful API architecture

## Features

### Core Features

- ✅ **Product Management**: Add, edit, delete products with SKU, pricing, and inventory tracking
- ✅ **Inventory Management**: Real-time stock tracking with low stock alerts
- ✅ **Transaction Processing**: Atomic transaction creation with stock validation
- ✅ **Cash Change Calculation**: Automatic change calculation for cash payments
- ✅ **Discounts & Promotions**: Item-level and transaction-level discounts (percentage or fixed amount)
- ✅ **Receipt Generation**: Professional receipt printing with company information
- ✅ **Transaction History**: View and filter past transactions
- ✅ **Reports & Analytics**: 
  - Sales reports (daily/weekly/monthly)
  - Top-selling products
  - Cashier performance metrics
  - CSV export functionality
- ✅ **User Management**: Role-based access (Cashier/Admin)
- ✅ **Payment Methods**: Cash, Card, and Credit support

## Project Structure

```
POS/
├── pos_backend/              # Django backend application
│   ├── inventory/            # Inventory management app
│   │   ├── models.py         # Employee, Product, Inventory models
│   │   ├── views.py          # Product CRUD APIs
│   │   ├── serializers.py    # Product serializers
│   │   └── urls.py           # Product API URLs
│   ├── transactions/         # Transactions app
│   │   ├── views.py          # Transaction creation and listing APIs
│   │   ├── reports_views.py   # Reports and analytics APIs
│   │   ├── serializers.py    # Transaction serializers
│   │   └── urls.py           # Transaction API URLs
│   └── pos_backend/          # Django project settings
│       ├── settings.py       # Django configuration
│       ├── receipt_settings.py  # Receipt customization
│       └── urls.py           # Main URL configuration
│
└── pos_frontend/             # React frontend application
    └── src/
        ├── App.jsx           # Main POS cashier interface
        ├── components/       # React components
        │   ├── Login.jsx
        │   ├── Receipt.jsx
        │   ├── Reports.jsx
        │   ├── TransactionHistory.jsx
        │   ├── ProductManagement.jsx
        │   └── LowStockAlert.jsx
        └── services/
            └── api.js        # API service layer
```

## Installation

### Prerequisites

- Python 3.8+
- Node.js 14+
- PostgreSQL 12+
- pip and npm

### Backend Setup

1. Navigate to backend directory:
```bash
cd pos_backend
```

2. Create virtual environment:
```bash
python -m venv venv
```

3. Activate virtual environment:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create `.env` file in `pos_backend/` directory:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_NAME=pos_db
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

6. Run migrations:
```bash
python manage.py migrate
```

7. Create superuser:
```bash
python manage.py createsuperuser
```

8. Run development server:
```bash
python manage.py runserver
```

Backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd pos_frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in `pos_frontend/` directory:
```env
REACT_APP_API_URL=http://localhost:8000/api/v1
```

4. Start development server:
```bash
npm start
```

Frontend will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/v1/auth/login/` - User login
- `POST /api/v1/auth/refresh/` - Refresh access token

### Products
- `GET /api/v1/products/search?sku=<sku>` - Search product by SKU
- `GET /api/v1/products/` - List all products
- `POST /api/v1/products/` - Create new product
- `PUT /api/v1/products/<id>/` - Update product
- `DELETE /api/v1/products/<id>/` - Delete product
- `PUT /api/v1/products/<id>/inventory` - Update inventory stock

### Transactions
- `POST /api/v1/transactions/new` - Create new transaction
- `GET /api/v1/transactions/` - List transactions (with filters)
- `GET /api/v1/transactions/<id>/` - Get transaction details
- `GET /api/v1/transactions/<id>/receipt` - Get receipt data

### Reports
- `GET /api/v1/transactions/reports/sales` - Sales report
- `GET /api/v1/transactions/reports/top-products` - Top products report
- `GET /api/v1/transactions/reports/cashier-performance` - Cashier performance
- `GET /api/v1/transactions/reports/export-sales` - Export sales to CSV

## Usage

1. **Login**: Use admin credentials to access the system
2. **Add Products**: Go to Products → Add Product (Admin only)
3. **Process Sales**: 
   - Scan or enter SKU to add items to cart
   - Apply discounts if needed
   - Select payment method
   - For cash payments, enter cash received
   - Complete sale
4. **View Reports**: Access Reports section for analytics (Admin only)
5. **View History**: Click History to see past transactions

## Configuration

### Receipt Customization

Edit `pos_backend/pos_backend/receipt_settings.py` to customize:
- Company name and address
- Contact information
- Tax ID
- Footer messages

### Database Configuration

Update database settings in `pos_backend/pos_backend/settings.py` or use environment variables.

## License

Proprietary - All rights reserved

## Author

Developed for grocery store and supermarket operations.
