// Menu items offered in the customer form's price breakdown (customers.html).
// Keep these prices in step with menu.html. Fields:
//   name  – shown in the list and saved on the order
//   price – price per unit in USD (null = type it in each time)
//   min   – minimum quantity (12 = "order at least a dozen")
//   from  – true when the menu shows "from $X" (the price is a starting point)
window.MENU_DATA = [
  { group: 'Custom Cakes & Services', items: [
    { name: 'Custom Cake', price: null },
    { name: 'Delivery & On-Site Assembly', price: null }
  ] },
  { group: 'Sweet Table', items: [
    { name: 'Macarons', price: 3, min: 12 },
    { name: 'Dessert Shooters', price: 4.25 },
    { name: 'Tiramisu Cups (mini, 2 oz)', price: 4.25 },
    { name: 'Tiramisu Cups (regular, 5 oz)', price: 5.5 },
    { name: 'Decorated Cream Puffs', price: 3.5, min: 12 },
    { name: 'Cupcakes', price: 3.5, from: true },
    { name: 'Jelly Cups', price: 4 },
    { name: 'Cookies', price: 3 },
    { name: 'Custom Icing Cookies', price: 4, min: 12, from: true },
    { name: 'Fruit Tarts (mini)', price: 3.5, min: 12 },
    { name: 'Fruit Tarts (regular)', price: 5, min: 12 },
    { name: 'Cheesecake Bites', price: 4.5 },
    { name: 'Mini Basque Cheesecakes', price: 3.5, min: 12, from: true },
    { name: 'Fresh Pineapple Cookies', price: 3.75 }
  ] },
  { group: 'Mini Pastries', items: [
    { name: 'Mini Shio Pan', price: 4, min: 12 },
    { name: 'Mini Butter Croissants', price: 3.5, min: 12 },
    { name: 'Mini Pain au Chocolat', price: 4, min: 12 },
    { name: 'Mini Filled Croissants', price: 4.5, min: 12, from: true },
    { name: 'Mini Dubai Chocolate Croissants', price: 5, min: 12 }
  ] },
  { group: 'Bông Lan Trứng Muối', items: [
    { name: 'Bông Lan Trứng Muối Cupcake', price: 5 },
    { name: 'Bông Lan Trứng Muối 14 cm, 1 layer', price: 15 },
    { name: 'Bông Lan Trứng Muối 14 cm, 2 layers', price: 23 },
    { name: 'Bông Lan Trứng Muối 18 cm, 2 layers', price: 40 },
    { name: 'Bông Lan Trứng Muối 20 cm, 2 layers', price: 48 },
    { name: 'Bông Lan Trứng Muối Party Tray, 2 layers', price: 85 }
  ] },
  { group: 'Signature Pastries', items: [
    { name: 'Butter Croissant', price: 5 },
    { name: 'Pain au Chocolat', price: 6 },
    { name: 'Filled Specialty Croissant', price: 6.5, from: true },
    { name: 'Dubai Chocolate Croissant', price: 7 },
    { name: 'Osaka Ham & Gruyère', price: 7.5 },
    { name: 'Pistachio New York Roll', price: 7.5 },
    { name: 'Craquelin Choux', price: 4.5, from: true },
    { name: 'Fruit-Shaped Entremets', price: 8, from: true },
    { name: 'Tiramisu Douyin', price: 55, from: true }
  ] },
  { group: 'Matcha Bar', items: [
    { name: 'Matcha Bar – Petite (50 servings)', price: 620 },
    { name: 'Matcha Bar – Essential (100 servings)', price: 920 },
    { name: 'Matcha Bar – Signature (160 servings)', price: 1420 },
    { name: 'Matcha Bar – Luxury (240 servings)', price: 2350 },
    { name: 'Matcha Bar – additional drink', price: 7 },
    { name: 'Matcha Bar – additional service hour', price: 100 }
  ] },
  { group: 'Coffee Bar', items: [
    { name: 'Coffee Bar', price: 550, from: true }
  ] },
  { group: 'Mâm Cúng', items: [
    { name: 'Mâm Cúng Set 1', price: 300 },
    { name: 'Mâm Cúng Set 2', price: 420 },
    { name: 'Mâm Cúng Set 3', price: 510 },
    { name: 'Xôi nhỏ (small)', price: 12 },
    { name: 'Chè nhỏ (small)', price: 10 },
    { name: 'Rau câu nhỏ (small)', price: 10 },
    { name: 'Cupcake (mâm cúng add-on)', price: 4.5 }
  ] }
];
