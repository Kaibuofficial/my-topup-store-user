document.addEventListener('DOMContentLoaded', () => {
    const menuIcon = document.getElementById('menuIcon'), navbar = document.getElementById('navbar');
    if (menuIcon) menuIcon.addEventListener('click', () => navbar.classList.toggle('active'));

    const isLoginPage = document.getElementById('signInForm'), isHomePage = document.getElementById('verifyForm'), isHistoryPage = document.getElementById('order-history-list'), isAccountPage = document.getElementById('logoutBtn'), isTopUpPage = document.getElementById('topUpForm'), isPaymentPage = document.getElementById('order-summary');
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const BUSAN_API_KEY = localStorage.getItem('busanApiKey');
    const BUSAN_API_BASE_URL = "https://1gamestopup.com/api/v1";
    const loggedInUser = sessionStorage.getItem('loggedInUser');

    if (!loggedInUser && !isLoginPage) { window.location.href = 'login.html'; return; }

    function displayUserWallet() { const walletBalanceSpan = document.getElementById('userWalletBalance'); if (loggedInUser && walletBalanceSpan) { let users = JSON.parse(localStorage.getItem('users')) || []; const currentUser = users.find(u => u.username === loggedInUser); walletBalanceSpan.textContent = `₹${currentUser ? (currentUser.wallet || 0) : 0}`; } }
    displayUserWallet();

    if (isLoginPage) {
        const showSignUp = document.getElementById('showSignUp'), showSignIn = document.getElementById('showSignIn'), signInSection = document.getElementById('signInSection'), signUpSection = document.getElementById('signUpSection'), authError = document.getElementById('auth-error');
        showSignUp.addEventListener('click', (e) => { e.preventDefault(); signInSection.style.display = 'none'; signUpSection.style.display = 'block'; });
        showSignIn.addEventListener('click', (e) => { e.preventDefault(); signUpSection.style.display = 'none'; signInSection.style.display = 'block'; });
        document.getElementById('signUpForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signUpEmail').value, username = document.getElementById('signUpUsername').value, password = document.getElementById('signUpPassword').value;
            let users = JSON.parse(localStorage.getItem('users')) || [];
            if (users.find(u => u.email === email)) { authError.textContent = 'Email already registered.'; return; }
            if (users.find(u => u.username === username)) { authError.textContent = 'Username already exists.'; return; }
            users.push({ email, username, password, wallet: 0, isBanned: false });
            localStorage.setItem('users', JSON.stringify(users));
            alert('Account created! Please sign in.');
            showSignIn.click();
        });
        document.getElementById('signInForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signInEmail').value, password = document.getElementById('signInPassword').value;
            let users = JSON.parse(localStorage.getItem('users')) || [];
            const user = users.find(u => u.email === email && u.password === password);
            if (user) {
                if (user.isBanned) { authError.textContent = 'This account has been banned.'; return; }
                sessionStorage.setItem('loggedInUser', user.username);
                window.location.href = 'index.html';
            } else { authError.textContent = 'Invalid email or password.'; }
        });
    }

    if (isAccountPage) { document.getElementById('loggedInUsername').textContent = loggedInUser; document.getElementById('logoutBtn').addEventListener('click', () => { sessionStorage.removeItem('loggedInUser'); window.location.href = 'login.html'; }); }
    if (isTopUpPage) { const topUpForm = document.getElementById('topUpForm'), topupStatus = document.getElementById('topup-status'); topUpForm.addEventListener('submit', (e) => { e.preventDefault(); const amount = parseInt(document.getElementById('topUpAmount').value); if (isNaN(amount) || amount <= 0) { topupStatus.textContent = 'Please enter a valid amount.'; topupStatus.style.color = 'red'; return; } let users = JSON.parse(localStorage.getItem('users')) || []; const userIndex = users.findIndex(u => u.username === loggedInUser); if (userIndex === -1) { alert('Error: Could not find user data.'); return; } users[userIndex].wallet = (users[userIndex].wallet || 0) + amount; localStorage.setItem('users', JSON.stringify(users)); topupStatus.textContent = `Successfully added ₹${amount} to your wallet!`; topupStatus.style.color = 'green'; topUpForm.reset(); displayUserWallet(); }); }

    if (isHomePage) {
        const verifyBtn = document.getElementById('verifyBtn'), resultDiv = document.getElementById('result'), userIdInput = document.getElementById('userId'), zoneIdInput = document.getElementById('zoneId'), productGrid = document.getElementById('product-grid'), proceedToPayBtn = document.getElementById('proceedToPayBtn');
        let selectedProduct = null;
        function loadProducts() { if (products.length === 0) { productGrid.innerHTML = '<p>No products available.</p>'; return; } productGrid.innerHTML = ''; products.forEach(p => { const card = document.createElement('div'); card.className = 'product-card'; card.dataset.productId = p.id; card.innerHTML = `<div class="title">${p.title}</div><div class="price">${p.price}</div>`; productGrid.appendChild(card); }); }
        productGrid.addEventListener('click', (e) => { const card = e.target.closest('.product-card'); if (!card) return; document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected')); card.classList.add('selected'); selectedProduct = card.dataset.productId; });
        async function verifyUsername() { const userId = userIdInput.value.trim(), zoneId = zoneIdInput.value.trim(); if (!userId || !zoneId) return alert('Fill in User ID and Zone ID.'); resultDiv.style.display = 'flex'; resultDiv.innerHTML = '<span class="spinner"></span> Verifying...'; verifyBtn.disabled = true; try { const response = await fetch(`https://api.isan.eu.org/nickname/ml?id=${userId}&zone=${zoneId}`); const data = await response.json(); if (data && data.name) { resultDiv.className = 'success'; resultDiv.innerHTML = `<strong>Username:</strong> ${data.name}`; proceedToPayBtn.disabled = false; } else { resultDiv.className = 'error'; resultDiv.textContent = '❌ Wrong User ID or Zone ID.'; } } catch (error) { resultDiv.className = 'error'; resultDiv.textContent = '❌ Verification failed.'; } finally { verifyBtn.disabled = false; } }
        function proceedToPayment() { if (!selectedProduct) { return alert('Please select a product first.'); } const orderDetails = { userId: userIdInput.value, zoneId: zoneIdInput.value, username: resultDiv.querySelector('strong').textContent, productId: selectedProduct }; sessionStorage.setItem('pendingOrder', JSON.stringify(orderDetails)); window.location.href = 'payment.html'; }
        loadProducts();
        verifyBtn.addEventListener('click', verifyUsername);
        proceedToPayBtn.addEventListener('click', proceedToPayment);
    }

    if (isPaymentPage) {
        const orderSummaryDiv = document.getElementById('order-summary'), paymentStatusDiv = document.getElementById('payment-status'), payWithWalletBtn = document.getElementById('payWithWalletBtn'), payWithUpiBtn = document.getElementById('payWithUpiBtn');
        const pendingOrder = JSON.parse(sessionStorage.getItem('pendingOrder'));
        if (!pendingOrder) { orderSummaryDiv.innerHTML = '<p style="color:red;">Error: No order found.</p>'; payWithWalletBtn.style.display = 'none'; payWithUpiBtn.style.display = 'none'; return; }
        const productInfo = products.find(p => p.id === pendingOrder.productId);
        orderSummaryDiv.innerHTML = `<p><strong>Username:</strong> ${pendingOrder.username}</p><p><strong>User ID:</strong> ${pendingOrder.userId} (${pendingOrder.zoneId})</p><p><strong>Item:</strong> ${productInfo.title}</p><p><strong>Price:</strong> ${productInfo.price}</p>`;
        
        async function purchaseWithWallet() {
            let users = JSON.parse(localStorage.getItem('users')) || []; const userIndex = users.findIndex(u => u.username === loggedInUser); if (userIndex === -1) return alert('User data not found.');
            const currentUser = users[userIndex]; const productCost = parseInt(productInfo.price.replace('₹', '').trim());
            if ((currentUser.wallet || 0) < productCost) { paymentStatusDiv.className = 'error'; paymentStatusDiv.textContent = 'Insufficient funds in wallet.'; return; }
            currentUser.wallet -= productCost; users[userIndex] = currentUser; localStorage.setItem('users', JSON.stringify(users)); displayUserWallet();
            await createBusanOrder(productInfo, productCost, 'Wallet');
        }
        function purchaseWithUpi() { paymentStatusDiv.innerHTML = `<span class="spinner"></span> Simulating UPI...`; setTimeout(() => { createBusanOrder(productInfo, 0, 'UPI'); }, 3000); }
        async function createBusanOrder(productInfo, cost, paymentMethod) {
            if (!BUSAN_API_KEY) { alert('Admin has not set API key.'); return; }
            const orderData = { playerId: pendingOrder.userId, zoneId: pendingOrder.zoneId, productId: productInfo.id, currency: "INR" };
            paymentStatusDiv.innerHTML = '<span class="spinner"></span> Creating order...'; payWithWalletBtn.disabled = true; payWithUpiBtn.disabled = true;
            try {
                const response = await fetch(`${BUSAN_API_BASE_URL}/api-service/order`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': BUSAN_API_KEY }, body: JSON.stringify(orderData) });
                const data = await response.json();
                if (data.success) { paymentStatusDiv.className = 'success'; paymentStatusDiv.innerHTML = `✅ Order successful!`; saveOrderToHistory({ ...data.data, title: productInfo.title, price: productInfo.price, paymentMethod: paymentMethod }); } 
                else { throw new Error(data.error || 'Order failed.'); }
            } catch (error) {
                paymentStatusDiv.className = 'error'; paymentStatusDiv.textContent = `❌ ${error.message}.`;
                if (paymentMethod === 'Wallet') { let users = JSON.parse(localStorage.getItem('users')); let userToRefund = users.find(u=>u.username===loggedInUser); userToRefund.wallet += cost; localStorage.setItem('users', JSON.stringify(users)); displayUserWallet(); }
            }
        }
        function saveOrderToHistory(orderData) { let allHistory = JSON.parse(localStorage.getItem('orderHistory')) || {}; let userHistory = allHistory[loggedInUser] || []; userHistory.unshift(orderData); allHistory[loggedInUser] = userHistory; localStorage.setItem('orderHistory', JSON.stringify(allHistory)); sessionStorage.removeItem('pendingOrder'); }
        payWithWalletBtn.addEventListener('click', purchaseWithWallet);
        payWithUpiBtn.addEventListener('click', purchaseWithUpi);
    }
    
    if (isHistoryPage) {
        const historyList = document.getElementById('order-history-list');
        const allHistory = JSON.parse(localStorage.getItem('orderHistory')) || {};
        const userHistory = allHistory[loggedInUser] || [];
        if (userHistory.length === 0) { historyList.innerHTML = '<p>You have no past orders.</p>'; } 
        else {
            historyList.innerHTML = '';
            userHistory.forEach(order => {
                const item = document.createElement('div');
                item.className = 'order-item';
                item.innerHTML = `<p><strong>${order.title}</strong> - ${order.price}</p><p class="order-id">Order ID: ${order.orderId}</p><p class="payment-method">Paid with: ${order.paymentMethod}</p>`;
                historyList.appendChild(item);
            });
        }
    }
});