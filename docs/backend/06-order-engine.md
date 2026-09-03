# 06 — Server-Authoritative Cart & Order Calculations Engine Specification

## 1. Overview & Architecture

Phase 6 implements the **Server-Authoritative Cart & Order Calculations Engine** for LankaEats Finland.

```
Client (React SPA / Mobile / API Client)
   │
   │ 1. Submits Order Payload: { restaurantId, items: [{ menuItemId, quantity }], deliveryType, deliveryAddress }
   ▼
POST /api/orders (Protected: Bearer JWT + CUSTOMER role)
   │
   │ 2. Authenticates JWT identity & extracts customer User details from MongoDB
   ▼
Server Order Placement Engine (backend/src/modules/orders/order.service.ts)
   │
   ├── 3. Validates Restaurant (status === 'active', isOpen === true, fulfillment rules)
   ├── 4. Server-Authoritative Price Lookup (reads unitPrice directly from MenuItem in MongoDB)
   ├── 5. Cross-Restaurant Protection (verifies every menuItem belongs to target restaurantId)
   ├── 6. Availability Check (verifies menuItem.isAvailable === true)
   ├── 7. Server Subtotal Calculation (calculatedSubtotal = sum(unitPrice * quantity) in integer cents)
   ├── 8. Minimum Order Enforcement (calculatedSubtotal >= restaurant.minOrder)
   ├── 9. Server Delivery Fee Calculation (deliveryFee from restaurant if delivery, 0 if pickup)
   ├── 10. Server Total Calculation (total = calculatedSubtotal + deliveryFee)
   ├── 11. Atomic Order Number Generation (generateNextOrderNumber() -> "LE-10001")
   └── 12. Historical Snapshot Creation & Document Persistence
```

---

## 2. Security Boundaries & Tampering Defenses

1. **Client Price & Financial Tampering Defense**: Any client-submitted `price`, `unitPrice`, `subtotal`, `deliveryFee`, or `total` fields are completely ignored. All calculations derive strictly from MongoDB database prices and integer cent math.
2. **Customer Identity Spoofing Defense**: Client attempts to submit `customerId` or `customerName` in payloads are overridden with the authenticated JWT user's identity.
3. **Cross-Restaurant Item Defense**: Order payloads submitting `menuItemId`s belonging to another restaurant return `400 BAD_REQUEST` ("does not belong to the selected restaurant"). No order document is created.
4. **Mass Assignment Protection**: Initial order status (`"received"`) and payment status (`"pending"`) are set by the server. Client attempts to submit `status: "completed"` or `paymentStatus: "paid"` are ignored.
5. **Quantity & Address Validation**: Quantities are validated via Zod (`1 <= quantity <= 99`, integer only). Delivery orders require a valid `deliveryAddress` (>= 5 chars).
