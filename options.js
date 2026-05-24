function loadAccounts() {
    chrome.storage.local.get(["accounts"], (result) => {
        const accounts = result.accounts || {};
        const listContainer = document.getElementById("list");
        listContainer.innerHTML = "";

        Object.keys(accounts).forEach((name) => {
            const item = document.createElement("div");
            item.className = "account-item";
            item.innerHTML = `
                <span><strong>${name}</strong></span>
                <button class="btn-delete" data-name="${name}">Удалить</button>
            `;
            listContainer.appendChild(item);
        });

        // Вешаем события удаления
        document.querySelectorAll(".btn-delete").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const nameToRemove = e.target.getAttribute("data-name");
                delete accounts[nameToRemove];
                chrome.storage.local.set({ accounts }, loadAccounts);
            });
        });
    });
}

document.getElementById("add-btn").addEventListener("click", () => {
    const nameInput = document.getElementById("name");
    const secretInput = document.getElementById("secret");

    const name = nameInput.value.trim();
    // Убираем пробелы из ключа на случай, если пользователь скопировал с ними
    const secret = secretInput.value.replace(/\s/g, "");

    if (!name || !secret) {
        alert("Заполните оба поля!");
        return;
    }

    chrome.storage.local.get(["accounts"], (result) => {
        const accounts = result.accounts || {};
        accounts[name] = secret;

        chrome.storage.local.set({ accounts }, () => {
            nameInput.value = "";
            secretInput.value = "";
            loadAccounts();
        });
    });
});

// Загружаем список при открытии страницы
document.addEventListener("DOMContentLoaded", loadAccounts);