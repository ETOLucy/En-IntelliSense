export const STORE_PRODUCTS = Object.freeze([
  { id: 'writemelo.plus.monthly', kind: 'subscription', name: 'WriteMelo Plus', monthly_units: 3000, grant_units: 0 },
  { id: 'writemelo.units.1000', kind: 'consumable', name: '1,000 usage units', monthly_units: 0, grant_units: 1000 },
  { id: 'writemelo.units.5000', kind: 'consumable', name: '5,000 usage units', monthly_units: 0, grant_units: 5000 },
]);

export function storeProduct(id) {
  return STORE_PRODUCTS.find(product => product.id === id) || null;
}

export function publicStoreProducts() {
  return STORE_PRODUCTS.map(product => ({ ...product }));
}
