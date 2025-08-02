document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const views = {
        hero: document.getElementById('hero-view'),
        products: document.getElementById('products-view'),
        productDetail: document.getElementById('product-detail-view'),
        cart: document.getElementById('cart-view'),
        checkout: document.getElementById('checkout-view'),
        orderConfirmation: document.getElementById('order-confirmation-view'),
        admin: document.getElementById('admin-view')
    };
    
    const containers = {
        products: document.getElementById('products-container'),
        productDetail: document.getElementById('product-detail-container'),
        cartItems: document.getElementById('cart-items-container'),
        cartSummary: document.getElementById('cart-summary'),
        cartSubtotal: document.querySelector('.cart-subtotal'),
        cartTotal: document.querySelector('.cart-total'),
        cartCount: document.getElementById('cart-count'),
        adminProducts: document.getElementById('admin-products-container'),
        floatingCart: document.getElementById('floating-cart')
    };
    
    const buttons = {
        viewProducts: document.getElementById('view-products'),
        viewCart: document.getElementById('view-cart'),
        viewAdmin: document.getElementById('view-admin'),
        backToProducts: document.getElementById('back-to-products'),
        backToProductsFromCart: document.getElementById('back-to-products-from-cart'),
        backToProductsFromConfirmation: document.getElementById('back-to-products-from-confirmation'),
        backToProductsFromAdmin: document.getElementById('back-to-products-from-admin'),
        backToCart: document.getElementById('back-to-cart'),
        checkout: document.getElementById('checkout-btn'),
        placeOrder: document.getElementById('place-order-btn'),
        addProduct: document.getElementById('add-product-btn'),
        explore: document.getElementById('explore-btn')
    };
    
    const filterTabs = document.querySelectorAll('.filter-btn');
    const adminTabs = document.querySelectorAll('.admin-tab');
    const paymentMethods = document.querySelectorAll('.payment-method');
    
    // State
    let products = [];
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let currentFilter = 'All';
    let jsonFileHandle = null;

    // Initialize the app
    init();
    
    // ================== INITIALIZATION ==================
    
    function init() {
        setupEventListeners();
        fetchProducts();
        updateCartCount();
        showView('hero');
    }
    
    function setupEventListeners() {
        // Navigation buttons
        buttons.viewProducts.addEventListener('click', () => showView('products'));
        buttons.viewCart.addEventListener('click', () => showView('cart'));
        buttons.viewAdmin.addEventListener('click', () => showView('admin'));
        buttons.explore.addEventListener('click', () => showView('products'));
        
        // Back buttons
        buttons.backToProducts.addEventListener('click', () => showView('products'));
        buttons.backToProductsFromCart.addEventListener('click', () => showView('products'));
        buttons.backToProductsFromConfirmation.addEventListener('click', () => showView('products'));
        buttons.backToProductsFromAdmin.addEventListener('click', () => showView('products'));
        buttons.backToCart.addEventListener('click', () => showView('cart'));
        
        // Checkout buttons
        buttons.checkout.addEventListener('click', () => showView('checkout'));
        buttons.placeOrder.addEventListener('click', placeOrder);
        
        // Admin buttons
        buttons.addProduct.addEventListener('click', addNewProduct);
        
        // Filter tabs
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.textContent;
                renderProducts();
            });
        });
        
        // Admin tabs
        adminTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                adminTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('.admin-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                document.getElementById(`admin-${tab.dataset.tab}-tab`).classList.add('active');
            });
        });
        
        // Payment methods
        paymentMethods.forEach(method => {
            method.addEventListener('click', () => {
                paymentMethods.forEach(m => m.classList.remove('active'));
                method.classList.add('active');
            });
        });
        
        // Floating cart
        containers.floatingCart.addEventListener('click', () => showView('cart'));
    }
    
    // ================== FILE SYSTEM ACCESS ==================
    
    async function initializeFileAccess() {
        try {
            // Request permission to access the file
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON Files',
                    accept: {'application/json': ['.json']},
                }],
                multiple: false,
                _preferPolyfill: false
            });
            
            // Verify this is our products.json file
            const file = await handle.getFile();
            if (file.name !== 'products.json') {
                throw new Error('Please select products.json');
            }
            
            jsonFileHandle = handle;
            console.log('Access granted to products.json');
            return true;
        } catch (error) {
            console.error('Error accessing file:', error);
            alert('Could not access products.json. Changes will be saved to browser storage only.');
            return false;
        }
    }
    
    async function saveProductsToFile() {
        try {
            if (!jsonFileHandle) {
                const accessGranted = await initializeFileAccess();
                if (!accessGranted) throw new Error('File access not granted');
            }
            
            // Create a writable stream
            const writable = await jsonFileHandle.createWritable();
            await writable.write(JSON.stringify({ products }, null, 2));
            await writable.close();
            
            console.log('products.json updated successfully');
            return true;
        } catch (error) {
            console.error('Error saving to file:', error);
            
            // Fallback to localStorage
            localStorage.setItem('admin-products', JSON.stringify(products));
            
            alert('Could not auto-save to file. Changes saved to browser storage instead.');
            return false;
        }
    }

    // ================== PRODUCT FUNCTIONS ==================
    
    async function fetchProducts() {
        try {
            const response = await fetch('products.json?t=' + Date.now()); // Cache bust
            if (!response.ok) throw new Error('Failed to load products.json');
            
            const data = await response.json();
            products = data.products || data;
            
            // Initialize product data structure
            products = products.map((product, index) => ({
                id: product.id || index + 1,
                name: product.name || 'Unnamed Product',
                price: product.price || 0,
                image: product.image || 'default-product.jpg',
                variants: product.variants || [],
                description: product.description || '',
                category: product.category || 'All'
            }));
            
            console.log('Loaded products from products.json');
            renderProducts();
            renderAdminProducts();
        } catch (error) {
            console.error('Error loading products:', error);
            loadFromLocalStorage();
        }
    }
    
    function loadFromLocalStorage() {
        const savedProducts = localStorage.getItem('admin-products');
        if (savedProducts) {
            products = JSON.parse(savedProducts);
            console.log('Loaded products from localStorage');
            renderProducts();
            renderAdminProducts();
        } else {
            products = [];
            console.log('Initialized empty product list');
        }
    }
    
    function renderProducts() {
        containers.products.innerHTML = '';
        
        let filteredProducts = products;
        
        // Apply filter if not "All"
        if (currentFilter !== 'All') {
            filteredProducts = products.filter(product => 
                product.category === currentFilter
            );
        }
        
        if (filteredProducts.length === 0) {
            containers.products.innerHTML = '<p class="no-products">No products available in this category.</p>';
            return;
        }
        
        filteredProducts.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-price">$${product.price.toFixed(2)}</p>
                    
                    <div class="product-variants">
                        ${product.variants.slice(0, 3).map(v => 
                            `<div class="variant-btn">${v}</div>`
                        ).join('')}
                        ${product.variants.length > 3 ? 
                            `<div class="variant-btn">+${product.variants.length - 3} more</div>` : ''}
                    </div>
                    
                    <button class="add-to-cart" data-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                </div>
            `;
            
            containers.products.appendChild(productCard);
            
            // Add click event to view details
            productCard.addEventListener('click', (e) => {
                if (!e.target.closest('.add-to-cart') && !e.target.closest('.variant-btn')) {
                    showProductDetail(product.id);
                }
            });
            
            // Add to cart button
            productCard.querySelector('.add-to-cart').addEventListener('click', function(e) {
                e.stopPropagation();
                addToCart(product.id, product.variants[0], 1);
            });
        });
    }
    
    function showProductDetail(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        containers.productDetail.innerHTML = `
            <div class="detail-image-container">
                <img src="${product.image}" alt="${product.name}" class="detail-image">
            </div>
            <div class="detail-info">
                <h2>${product.name}</h2>
                <p class="detail-price">$${product.price.toFixed(2)}</p>
                <p class="detail-description">${product.description}</p>
                
                <div class="detail-variants">
                    <h4>Available Options</h4>
                    <div class="variant-buttons">
                        ${product.variants.map(v => 
                            `<div class="variant-btn ${v === product.variants[0] ? 'active' : ''}">${v}</div>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="detail-actions">
                    <div class="quantity-selector">
                        <button class="quantity-btn minus"><i class="fas fa-minus"></i></button>
                        <input type="number" class="quantity-input" value="1" min="1">
                        <button class="quantity-btn plus"><i class="fas fa-plus"></i></button>
                    </div>
                    <button class="add-to-cart-btn" data-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                </div>
            </div>
        `;
        
        // Variant selection
        containers.productDetail.querySelectorAll('.variant-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                containers.productDetail.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });
        
        // Quantity selector
        const quantityInput = containers.productDetail.querySelector('.quantity-input');
        containers.productDetail.querySelector('.minus').addEventListener('click', () => {
            if (quantityInput.value > 1) quantityInput.value--;
        });
        containers.productDetail.querySelector('.plus').addEventListener('click', () => {
            quantityInput.value++;
        });
        
        // Add to cart button
        containers.productDetail.querySelector('.add-to-cart-btn').addEventListener('click', function() {
            const selectedVariant = containers.productDetail.querySelector('.variant-btn.active').textContent;
            const quantity = parseInt(quantityInput.value);
            addToCart(product.id, selectedVariant, quantity);
            
            // Show success animation
            const btn = this;
            btn.innerHTML = '<i class="fas fa-check"></i> Added!';
            btn.classList.add('success');
            
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
                btn.classList.remove('success');
            }, 1500);
        });
        
        showView('productDetail');
    }
    
    // ================== CART FUNCTIONS ==================
    
    function addToCart(productId, variant, quantity) {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        // Check if item already exists in cart
        const existingItemIndex = cart.findIndex(item => 
            item.productId === productId && item.variant === variant
        );
        
        if (existingItemIndex >= 0) {
            // Update quantity if item exists
            cart[existingItemIndex].quantity += quantity;
        } else {
            // Add new item to cart
            cart.push({
                productId,
                variant,
                quantity,
                price: product.price,
                name: product.name,
                image: product.image
            });
        }
        
        // Save to localStorage
        saveCart();
        updateCartCount();
        
        // Show floating cart animation
        animateFloatingCart();
    }
    
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }
    
    function updateCartCount() {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        containers.cartCount.textContent = totalItems;
    }
    
    function animateFloatingCart() {
        containers.floatingCart.style.transform = 'scale(1.1)';
        setTimeout(() => {
            containers.floatingCart.style.transform = 'scale(1)';
        }, 300);
    }
    
    function renderCart() {
        containers.cartItems.innerHTML = '';
        
        if (cart.length === 0) {
            containers.cartItems.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
            containers.cartSummary.style.display = 'none';
            return;
        }
        
        containers.cartSummary.style.display = 'block';
        
        let subtotal = 0;
        
        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            
            cartItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <h3 class="cart-item-title">${item.name}</h3>
                    <p class="cart-item-variant">${item.variant}</p>
                    <p class="cart-item-price">$${item.price.toFixed(2)}</p>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn minus" data-index="${index}"><i class="fas fa-minus"></i></button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn plus" data-index="${index}"><i class="fas fa-plus"></i></button>
                </div>
                <div class="cart-item-total">$${itemTotal.toFixed(2)}</div>
                <div class="cart-item-actions">
                    <button class="remove-item" data-index="${index}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            containers.cartItems.appendChild(cartItem);
        });
        
        // Update totals
        containers.cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        containers.cartTotal.textContent = `$${subtotal.toFixed(2)}`;
        
        // Add event listeners to quantity buttons
        document.querySelectorAll('.cart-item-quantity .minus').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                updateCartItemQuantity(index, -1);
            });
        });
        
        document.querySelectorAll('.cart-item-quantity .plus').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                updateCartItemQuantity(index, 1);
            });
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removeFromCart(index);
            });
        });
    }
    
    function updateCartItemQuantity(index, change) {
        const newQuantity = cart[index].quantity + change;
        
        if (newQuantity < 1) {
            removeFromCart(index);
            return;
        }
        
        cart[index].quantity = newQuantity;
        saveCart();
        updateCartCount();
        renderCart();
    }
    
    function removeFromCart(index) {
        cart.splice(index, 1);
        saveCart();
        updateCartCount();
        renderCart();
    }
    
    function placeOrder(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const address = document.getElementById('address').value;
        
        if (!name || !email || !address) {
            alert('Please fill in all required fields');
            return;
        }
        
        // In a real app, you would send this to a server
        console.log('Order placed:', {
            customer: { name, email, address },
            items: cart,
            total: cart.reduce((total, item) => total + (item.price * item.quantity), 0),
            paymentMethod: document.querySelector('.payment-method.active').textContent.trim()
        });
        
        // Clear cart
        cart = [];
        saveCart();
        updateCartCount();
        
        // Show confirmation
        showView('orderConfirmation');
    }
    
    // ================== ADMIN FUNCTIONS ==================
    
    function renderAdminProducts() {
        containers.adminProducts.innerHTML = '';
        
        if (products.length === 0) {
            containers.adminProducts.innerHTML = '<p class="no-products">No products available.</p>';
            return;
        }
        
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'admin-product-card';
            
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="admin-product-image">
                <div class="admin-product-info">
                    <h3>${product.name}</h3>
                    <p>$${product.price.toFixed(2)}</p>
                    <p class="admin-product-description">${product.description.substring(0, 60)}...</p>
                </div>
                <div class="admin-product-actions">
                  
                    <button class="admin-action-btn delete-btn" data-id="${product.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            
            containers.adminProducts.appendChild(productCard);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                deleteProduct(productId);
            });
        });
        
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                editProduct(productId);
            });
        });
    }
    
    async function deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        
        products = products.filter(p => p.id !== productId);
        const success = await saveProductsToFile();
        
        if (success) {
            renderAdminProducts();
            renderProducts();
            alert('Product deleted from products.json!');
        }
    }
    
    async function updateProduct(productId) {
        const productData = {
            id: productId,
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            image: document.getElementById('product-image').value,
            variants: document.getElementById('product-variants').value.split(',').map(v => v.trim()),
            description: document.getElementById('product-description').value,
            category: 'All'
        };
        
        // Validate inputs
        if (!productData.name || productData.name.length < 2) {
            alert('Product name must be at least 2 characters');
            return;
        }
        if (isNaN(productData.price) || productData.price <= 0) {
            alert('Please enter a valid price');
            return;
        }
        if (!productData.image) {
            alert('Please provide an image URL');
            return;
        }
        if (productData.variants.length === 0) {
            alert('Please add at least one variant');
            return;
        }
        if (!productData.description || productData.description.length < 10) {
            alert('Description must be at least 10 characters');
            return;
        }
        
        const index = products.findIndex(p => p.id === productId);
        if (index !== -1) {
            products[index] = productData;
            const success = await saveProductsToFile();
            
            if (success) {
                resetProductForm();
                renderAdminProducts();
                renderProducts();
                alert('Product updated in products.json!');
            }
        }
    }
    
    async function addNewProduct(e) {
        if (e) e.preventDefault();
        
        const productData = {
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            image: document.getElementById('product-image').value,
            variants: document.getElementById('product-variants').value.split(',').map(v => v.trim()),
            description: document.getElementById('product-description').value,
            category: 'All'
        };
        
        // Validate inputs
        if (!productData.name || productData.name.length < 2) {
            alert('Product name must be at least 2 characters');
            return;
        }
        if (isNaN(productData.price) || productData.price <= 0) {
            alert('Please enter a valid price');
            return;
        }
        if (!productData.image) {
            alert('Please provide an image URL');
            return;
        }
        if (productData.variants.length === 0) {
            alert('Please add at least one variant');
            return;
        }
        if (!productData.description || productData.description.length < 10) {
            alert('Description must be at least 10 characters');
            return;
        }
        
        // Generate new ID
        productData.id = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        
        products.push(productData);
        const success = await saveProductsToFile();
        
        if (success) {
            resetProductForm();
            renderAdminProducts();
            renderProducts();
            alert('New product added to products.json!');
        }
    }
    
    function resetProductForm() {
        document.getElementById('product-name').value = '';
        document.getElementById('product-price').value = '';
        document.getElementById('product-image').value = '';
        document.getElementById('product-variants').value = '';
        document.getElementById('product-description').value = '';
        
        // Reset button to "Add"
        const addBtn = buttons.addProduct;
        addBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Product';
        addBtn.onclick = addNewProduct;
    }
    
    // ================== VIEW MANAGEMENT ==================
    
    function showView(viewName) {
        // Hide all views
        Object.values(views).forEach(view => {
            view.style.display = 'none';
            view.classList.remove('active');
        });
        
        // Show selected view
        views[viewName].style.display = 'block';
        setTimeout(() => {
            views[viewName].classList.add('active');
        }, 10);
        
        // Special cases
        if (viewName === 'cart') {
            renderCart();
        } else if (viewName === 'admin') {
            renderAdminProducts();
        } else if (viewName === 'products') {
            renderProducts();
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
});