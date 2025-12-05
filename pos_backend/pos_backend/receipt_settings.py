"""
Receipt Configuration Settings
Customize company information for receipts
"""

# Company Information for Receipts
RECEIPT_COMPANY_INFO = {
    'name': 'DilmaSuperPOS',
    'address': 'Dubai, UAE',
    'phone': '+971 XX XXX XXXX',
    'email': 'info@supermarket.ae',
    'tax_id': 'VAT: 123456789',
    'website': 'www.supermarket.ae',
}

# Receipt Settings
RECEIPT_SETTINGS = {
    'tax_rate': 0.05,  # 5% VAT for Dubai
    'currency': 'AED',
    'currency_symbol': 'AED',
    'print_width': 80,  # mm for receipt printers
    'auto_print': False,  # Auto-print receipts after transaction
}


