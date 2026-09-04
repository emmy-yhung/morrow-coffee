(() => {
    "use strict";

    const CART_KEY = "morrow-cart";
    // Replace this with your Paystack public key. Never expose a secret key here.
    const PAYSTACK_PUBLIC_KEY = "pk_test_95f80b03832e403106f058abf0d003077330039b";
    const menuButton = document.querySelector(".menu-toggle");
    const navigation = document.querySelector(".primary-nav");
    const bagLink = document.querySelector(".bag-link");
    const bagCount = document.querySelector(".bag-count");
    const newsletterForm = document.querySelector(".newsletter-form");

    const readCart = () => {
        try {
            const savedCart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
            return Array.isArray(savedCart) ? savedCart : [];
        } catch {
            return [];
        }
    };

    let cart = readCart();

    const saveCart = () => {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
        } catch {
            // The cart still works for the current session if storage is unavailable.
        }
    };

    const totalItems = () => cart.reduce((total, item) => total + item.quantity, 0);
    const money = (amount) => `₦${amount.toLocaleString("en-NG")}`;

    const updateBagCount = () => {
        bagCount.textContent = totalItems();
        bagLink.setAttribute("aria-label", `Shopping bag, ${totalItems()} items`);
    };

    const closeMenu = () => {
        menuButton.setAttribute("aria-expanded", "false");
        navigation.classList.remove("is-open");
    };

    menuButton.addEventListener("click", () => {
        const isOpen = menuButton.getAttribute("aria-expanded") === "true";
        menuButton.setAttribute("aria-expanded", String(!isOpen));
        navigation.classList.toggle("is-open", !isOpen);
    });

    navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => {
        if (window.innerWidth > 800) closeMenu();
    });

    const drawer = document.createElement("aside");
    drawer.className = "cart-drawer";
    drawer.setAttribute("aria-label", "Shopping bag");
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
        <div class="cart-drawer-header"><h2>Your bag</h2><button type="button" class="cart-close" aria-label="Close shopping bag">×</button></div>
        <div class="cart-items"></div>
        <div class="cart-footer"><div><span>Subtotal</span><strong class="cart-total">$0.00</strong></div><label class="checkout-email-label" for="checkout-email">Email for your receipt</label><input class="checkout-email" id="checkout-email" type="email" placeholder="you@example.com" autocomplete="email" required><button class="checkout-button" type="button">Continue to checkout <span>→</span></button><p class="checkout-message" role="status"></p><p class="checkout-note">Pay securely with card, bank transfer, or USSD.</p></div>
    `;
    document.body.append(drawer);

    const overlay = document.createElement("div");
    overlay.className = "cart-overlay";
    document.body.append(overlay);

    const closeCart = () => {
        if (drawer.contains(document.activeElement)) document.activeElement.blur();
        drawer.classList.remove("is-open");
        overlay.classList.remove("is-visible");
        drawer.setAttribute("aria-hidden", "true");
        document.body.classList.remove("cart-is-open");
    };

    const renderCart = () => {
        const items = drawer.querySelector(".cart-items");
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        drawer.querySelector(".cart-total").textContent = money(total);
        updateBagCount();

        if (!cart.length) {
            items.innerHTML = '<p class="empty-cart">Your bag is waiting for something good.</p>';
            return;
        }

        items.innerHTML = cart.map((item) => `
            <div class="cart-item" data-product="${item.name}">
                <div><strong>${item.name}</strong><span>${money(item.price)} each</span></div>
                <div class="cart-item-controls"><button type="button" data-action="decrease" aria-label="Decrease ${item.name} quantity">−</button><span>${item.quantity}</span><button type="button" data-action="increase" aria-label="Increase ${item.name} quantity">+</button><button type="button" data-action="remove" aria-label="Remove ${item.name}">Remove</button></div>
            </div>
        `).join("");
    };

    const openCart = () => {
        closeMenu();
        renderCart();
        drawer.classList.add("is-open");
        overlay.classList.add("is-visible");
        drawer.setAttribute("aria-hidden", "false");
        document.body.classList.add("cart-is-open");
        drawer.querySelector(".cart-close").focus();
    };

    const addToCart = (name, price) => {
        const existing = cart.find((item) => item.name === name);
        if (existing) existing.quantity += 1;
        else cart.push({ name, price, quantity: 1 });
        saveCart();
        openCart();
    };

    document.querySelectorAll(".add-to-bag").forEach((button) => {
        button.addEventListener("click", () => addToCart(button.dataset.product, Number(button.dataset.price)));
    });
    bagLink.addEventListener("click", (event) => {
        event.preventDefault();
        openCart();
    });
    drawer.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const item = button.closest(".cart-item");
        const product = cart.find((entry) => entry.name === item.dataset.product);
        if (!product) return;
        if (button.dataset.action === "increase") product.quantity += 1;
        if (button.dataset.action === "decrease") product.quantity -= 1;
        if (button.dataset.action === "remove" || product.quantity < 1) cart = cart.filter((entry) => entry !== product);
        saveCart();
        renderCart();
    });
    drawer.querySelector(".cart-close").addEventListener("click", closeCart);
    overlay.addEventListener("click", closeCart);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeCart();
            closeMenu();
        }
    });
    drawer.querySelector(".checkout-button").addEventListener("click", () => {
        const emailInput = drawer.querySelector(".checkout-email");
        const message = drawer.querySelector(".checkout-message");
        if (!cart.length) {
            message.textContent = "Add an item before checking out.";
            return;
        }
        if (!emailInput.checkValidity()) {
            message.textContent = "Enter a valid email address to continue.";
            emailInput.focus();
            return;
        }
        if (!window.PaystackPop || PAYSTACK_PUBLIC_KEY.includes("replace_with")) {
            message.textContent = "Add your Paystack public key in app.js to enable payments.";
            return;
        }
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const reference = `morrow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const handler = window.PaystackPop.setup({
            key: PAYSTACK_PUBLIC_KEY,
            email: emailInput.value.trim(),
            amount: Math.round(total * 100),
            currency: "NGN",
            ref: reference,
            metadata: {
                custom_fields: cart.map((item) => ({
                    display_name: item.name,
                    variable_name: item.name.toLowerCase().replace(/\s+/g, "_"),
                    value: String(item.quantity)
                }))
            },
            callback: async (response) => {
                message.textContent = "Confirming your payment securely...";
                try {
                    const verification = await fetch("/api/verify-payment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            reference: response.reference,
                            items: cart.map(({ name, quantity }) => ({ name, quantity }))
                        })
                    });
                    const result = await verification.json();
                    if (!verification.ok || result.verified !== true) {
                        throw new Error(result.error || "Payment verification failed");
                    }
                    message.textContent = `Payment confirmed. Reference: ${result.reference}`;
                    cart = [];
                    saveCart();
                    renderCart();
                } catch (error) {
                    message.textContent = `${error.message} Contact us with your payment reference.`;
                }
            },
            onClose: () => {
                message.textContent = "Payment window closed. Your bag is still saved.";
            }
        });
        handler.openIframe();
    });

    newsletterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const formMessage = newsletterForm.querySelector(".form-message");
        const input = newsletterForm.querySelector("input");
        if (!input.checkValidity()) {
            formMessage.textContent = "Please enter a valid email address.";
            input.focus();
            return;
        }
        formMessage.textContent = "You are on the list — see you soon.";
        input.value = "";
    });

    updateBagCount();
})();
