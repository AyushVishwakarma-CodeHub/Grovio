# Pre-Configured Test Accounts 🔑
> Use the following pre-configured test profiles to verify role permissions, live dashboards, real-time chats, and delivery timeline workflows.

---

## 👥 Roles & Logins

### 1. Enterprise Administrator (Admin)
*   **Email**: `admin@grovio.com`
*   **Password**: `admin123`
*   **Key Operations**: Full dashboard controls, user account management (role changes, account suspensions), coupon setups, analytics visualizations, catalog additions, and support claim resolutions.

### 2. Store Manager (Manager)
*   **Email**: `manager@grovio.com`
*   **Password**: `manager123`
*   **Key Operations**: Catalog CRUD, inventory logs inspections, coupon lists, support helpdesk threads, and orders status updates.

### 3. Delivery Partner (Rider)
*   **Email**: `rider@grovio.com`
*   **Password**: `rider123`
*   **Key Operations**: Claims assigned orders, streams GPS simulation coordinate drifts, validates OTP deliveries, views driver earnings graphs.

### 4. Shopper Shopper (Customer)
*   **Email**: `customer@grovio.com`
*   **Password**: `customer123`
*   **Key Operations**: Browses catalog, applies coupon codes, checkouts (COD/Razorpay), tracks order delivery timelines via dark SVG maps, downloads PDF Tax Invoices, and files support claim tickets.

---

## 🚀 Step-by-Step Test Scenarios

### Scenario A: Order Checkout & Delivery Timeline Sync
1. Log in as a **Customer** (`customer@grovio.com`). Add items to your cart, click checkout, select a slot, and place order via Cash On Delivery.
2. Under **My Orders** in your profile, locate the order and click the Arrow icon to load the **Order Tracking Page** showing Delhi Hub.
3. Open a separate window/incognito browser, log in as **Rider** (`rider@grovio.com`).
4. On the Rider dashboard, you will find the newly placed order in the feeds. Click **Accept Delivery**.
5. Once accepted, toggle the **Simulate Delivery Route** simulator check. You will see coordinates drift.
6. Look back at the customer tracking screen: the driver profile card syncs instantly, showing name/phone, and the delivery scooter marker moves along the Delhi Hub map to the destination address.
7. Under Rider screen, click **Picked Up** -> **Mark Delivered**. Input the OTP shown on the customer's tracking screen to finish the order.

### Scenario B: Support Claim & Refund Restock Automation
1. Log in as a **Customer** (`customer@grovio.com`).
2. Go to **Support Helpdesk** in the navbar profile dropdown list.
3. Click **Create Support Claim**, choose category **Refund Request**, input value (e.g. `200`), select the corresponding Order ID, and write a complaint description.
4. Log in as **Admin** (`admin@grovio.com`) in another window, go to **Support Helpdesk** tab.
5. Click on the customer's support ticket. Start typing messages. They stream instantly between customer and admin windows.
6. Click **Approve Refund**. The status changes to Approved, the customer order is automatically marked cancelled/refunded, items are restocked back into the inventory counts, and an automated log entry is appended to the inventory logs ledger.
