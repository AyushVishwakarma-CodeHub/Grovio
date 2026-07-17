# Grovio API Specifications 🧾
> All request payloads and response bodies use JSON representation. Endpoints return structured response objects wrapping target logs in `success: true` and `data` properties.

---

## 🔒 Authentication Routes

### 1. Register Account
*   **Endpoint**: `POST /api/auth/register`
*   **Headers**: `Content-Type: application/json`
*   **Payload**:
    ```json
    {
      "name": "Ayush",
      "email": "ayush@gmail.com",
      "password": "securepassword123",
      "phone": "1234567890"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "User registered successfully",
      "data": {
        "token": "JWT_TOKEN_HERE",
        "user": {
          "_id": "USER_ID",
          "name": "Ayush",
          "email": "ayush@gmail.com",
          "role": "customer"
        }
      }
    }
    ```

### 2. Login Account
*   **Endpoint**: `POST /api/auth/login`
*   **Payload**:
    ```json
    {
      "email": "ayush@gmail.com",
      "password": "securepassword123"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Login successful",
      "data": {
        "token": "JWT_TOKEN_HERE",
        "user": { ... }
      }
    }
    ```

---

## 📦 SKU Catalog Routes

### 1. Retrieve Products Catalog (Public)
*   **Endpoint**: `GET /api/products`
*   **Query Params**: `category` (optional filter slug), `search` (optional search query)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "products": [
          {
            "_id": "PROD_ID",
            "name": "Fresh Paneer",
            "slug": "fresh-paneer",
            "price": 82,
            "stock": 100,
            "category": "dairy"
          }
        ]
      }
    }
    ```

### 2. Add New Product (Admin/Manager)
*   **Endpoint**: `POST /api/products`
*   **Headers**: `Authorization: Bearer <Token>`
*   **Payload**:
    ```json
    {
      "name": "Organic Tomato",
      "description": "Juicy and direct from farms",
      "price": 40,
      "discountPrice": 35,
      "stock": 120,
      "unit": "500g",
      "category": "fruits-vegetables",
      "lowStockThreshold": 15
    }
    ```

---

## 📋 Order Management Routes

### 1. Place Checkout Order
*   **Endpoint**: `POST /api/orders`
*   **Headers**: `Authorization: Bearer <Token>`
*   **Payload**:
    ```json
    {
      "items": [
        { "product": "PROD_ID", "quantity": 2 }
      ],
      "shippingAddress": {
        "addressLine1": "xyz apartment",
        "city": "Jalandhar",
        "state": "Punjab",
        "zipCode": "144411"
      },
      "paymentMethod": "cod",
      "deliverySlot": "instant"
    }
    ```

### 2. Update Order Status (Admin/Manager/Rider)
*   **Endpoint**: `PUT /api/orders/:id/status`
*   **Payload**:
    ```json
    {
      "status": "packing"
    }
    ```

### 3. Rider Self-Assignment
*   **Endpoint**: `PUT /api/orders/:id/assign`
*   **Headers**: `Authorization: Bearer <Rider_Token>`
*   **Response (200 OK)**: Assigns the active logged-in rider to the delivery partner slot.

---

## 📈 System Analytics (Admin/Manager)

### 1. Fetch Executive Analytics
*   **Endpoint**: `GET /api/analytics`
*   **Headers**: `Authorization: Bearer <Admin_Token>`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "financials": { "totalRevenue": 45000, "averageOrderValue": 350 },
        "monthlySales": [ { "_id": "2026-07", "revenue": 12000, "count": 30 } ],
        "topProducts": [ { "name": "Butter", "sold": 40 } ]
      }
    }
    ```

---

## 🆘 Support Helpdesk Routes

### 1. Create Ticket Claim (Customer)
*   **Endpoint**: `POST /api/support`
*   **Payload**:
    ```json
    {
      "subject": "Missing items in bag",
      "category": "complaint",
      "message": "The Amul Butter item was missing from my delivery package.",
      "orderId": "ORDER_ID"
    }
    ```

### 2. Send Message / Approve Refund (Support Thread)
*   **Endpoint**: `POST /api/support/:id/reply`
*   **Payload**:
    ```json
    {
      "text": "Your refund claims have been approved and processed.",
      "refundStatus": "approved",
      "ticketStatus": "resolved"
    }
    ```
