const products = [
  { id: 1, name: 'Eudora Royal colônia', brand: 'Eudora', price: 140.90, old: 140.90, badge: 'Destaque', cat: 'masculino', image: './imag/assets/foto_20.png' },
  { id: 2, name: 'Natura Espécies', brand: 'Natura', price: 240.90, old: 299.90, badge: 'Fragrância', cat: 'masculino', image: './imag/assets/foto_2.png' },
  { id: 3, name: 'Natura Homem', brand: 'Natura', price: 134.90, old: 79.90, badge: 'Oferta', cat: 'oferta', image: './imag/assets/foto_3.png' },
  { id: 4, name: 'Luna Fascinante', brand: 'Kit presente', price: 94.90, badge: 'Kit', cat: 'feminino', image: './imag/assets/foto_4.png' },
  { id: 5, name: 'Pula Pula Água de colônia', brand: 'Kit presente', price: 64.90, badge: 'Presente', cat: 'presente', image: './imag/assets/foto_5.png' },
  { id: 6, name: 'Pique Pega Água de colônia', brand: 'Natura', price: 64.90, badge: 'Especial', cat: 'feminino', image: './imag/assets/foto_6.png' },
  { id: 7, name: 'Eudora Royal colônia', brand: 'Eudora', price: 140.90, old: 119.90, badge: 'Destaque', cat: 'feminino', image: './imag/assets/foto_31.jpg' },
  { id: 8, name: 'Natura kaiak cada', brand: 'Casa & presente', price: 39.90, badge: 'Presente', cat: 'presente', image: './imag/assets/foto_8.png' },
  { id: 9, name: 'Natura Todo Dia Cada Caixa Com 5', brand: 'Perfumaria', price: 31.90, badge: 'Popular', cat: 'feminino', image: './imag/assets/foto_9.png' },
  { id: 10, name: 'Natura Todo Dia Cada 1 Unidade', brand: 'Perfumaria', price: 61.90, badge: 'Marcante', cat: 'feminino', image: './imag/assets/foto_10.png' },
  { id: 11, name: 'Avon Care O Oqueridinho 700ml de hidratação', brand: 'Perfumaria', price: 39.90, badge: 'Clássico', cat: 'feminino', image: './imag/assets/image.png' },
  { id: 12, name: 'Sabonete Vegetal em Barra Com 4 Unidades', brand: 'O Boticário', price: 32.90, badge: 'Novo', cat: 'presente', image: './imag/assets/foto_12.png' }
];

let cart = {};
let current = 'todos';
const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function render() {
  const search = document.getElementById('busca').value.toLowerCase();
  const list = (current === 'todos' ? products : products.filter(product => product.cat === current))
    .filter(product => !search || `${product.name} ${product.brand}`.toLowerCase().includes(search));
  const sort = document.getElementById('sort').value;
  if (sort === 'menor') list.sort((a, b) => a.price - b.price);
  if (sort === 'maior') list.sort((a, b) => b.price - a.price);

  document.getElementById('resultados').textContent = `${list.length} ${list.length === 1 ? 'item encontrado' : 'itens encontrados'}`;
  document.getElementById('grid').innerHTML = list.map(product => `
    <article class="product">
      <div class="photo">
        <span class="badge">${product.badge}</span>
        <button class="heart" onclick="alert('Favorito: ${product.name}')" aria-label="Adicionar aos favoritos">♡</button>
        <img class="productImage" src="${product.image}" alt="${product.name}" loading="lazy">
      </div>
      <div class="info">
        <div class="brandline">${product.brand}</div>
        <div class="pname">${product.name}</div>
        <div class="size">Fragrância / presente selecionado</div>
        <div class="price">${product.old > product.price ? `<span class="old">${money(product.old)}</span>` : ''}${money(product.price)}</div>
        <button class="add" onclick="add(${product.id})">Adicionar à sacola</button>
      </div>
    </article>
  `).join('') || '<p>Nenhum produto encontrado.</p>';
}

function add(id) {
  cart[id] = (cart[id] || 0) + 1;
  update();
  openCart();
}

function update() {
  let total = 0;
  let count = 0;
  const ids = Object.keys(cart);
  document.getElementById('cartItems').innerHTML = ids.length ? ids.map(id => {
    const product = products.find(item => item.id === Number(id));
    const quantity = cart[id];
    total += product.price * quantity;
    count += quantity;
    return `<div class="cartrow"><div><b>${product.name}</b><div style="font-size:12px;color:#746c65">${money(product.price)} cada</div></div><div class="qty"><button onclick="qty(${id}, -1)" aria-label="Diminuir">−</button>${quantity}<button onclick="qty(${id}, 1)" aria-label="Aumentar">+</button></div></div>`;
  }).join('') : '<div style="padding:35px 0;text-align:center;color:#746c65">Sua sacola está vazia.</div>';
  document.getElementById('total').textContent = money(total);
  const countElement = document.getElementById('count');
  countElement.textContent = count;
  countElement.style.display = count ? 'flex' : 'none';
}

function qty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  update();
}

function openCart() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('overlay').classList.add('show');
  update();
}

function closeCart() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

async function checkout() {
  const ids = Object.keys(cart);
  if (!ids.length) return;
  const button = document.querySelector('.checkout');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Abrindo Mercado Pago...';
  try {
    const response = await fetch('/api/mercadopago/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: ids.map(id => ({ id: Number(id), quantity: cart[id] })) })
    });
    const preference = await response.json();
    if (!response.ok || !preference.init_point) throw new Error(preference.error || 'Não foi possível iniciar o pagamento.');
    window.location.href = preference.init_point;
  } catch (error) {
    alert(error instanceof TypeError
      ? 'Nao foi possivel conectar a loja. Verifique sua conexao com a internet e tente novamente.'
      : error.message);
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function setFilter(filter) {
  current = filter;
  document.querySelectorAll('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
  render();
}

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
document.querySelectorAll('.collection').forEach(link => link.addEventListener('click', () => setFilter(link.dataset.filter)));
document.getElementById('busca').addEventListener('input', render);
document.getElementById('sort').addEventListener('change', render);
render();
update();
