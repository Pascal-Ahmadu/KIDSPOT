/**
 * Delivery settings. The store doesn't charge for delivery: orders go out with Bolt / inDrive / GIGM and
 * the customer pays the rider or the park directly. Shoppers only see the admin's note.
 * Kept free of server code so cart/checkout (client) can use it.
 */
export type DeliverySettings = {
  /** Shown in the cart, at checkout and on the Support page. */
  note: string;
};

export const DEFAULT_DELIVERY_NOTE =
  "We send orders with Bolt or inDrive within Lagos and with GIGM to other states. You pay the rider (or the GIGM park) directly for delivery, and we call you before we send your order.";
