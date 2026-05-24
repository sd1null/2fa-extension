// Перевод Base32 ключа в массив байт
function base32ToBuf(str) {
    const b32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    str = str.replace(/\s/g, "").replace(/=+$/, "").toUpperCase();
    let bits = "";
    for (let i = 0; i < str.length; i++) {
        let val = b32.indexOf(str.charAt(i));
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, '0');
    }
    const buf = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < buf.length; i++) {
        buf[i] = parseInt(bits.substr(i * 8, 8), 2);
    }
    return buf.buffer;
}

// Генерация TOTP кода с помощью встроенного Web Crypto API
async function generateTOTP(secret) {
    try {
        const keyBuf = base32ToBuf(secret);
        const counter = Math.floor(Math.floor(Date.now() / 1000) / 30);
        
        const counterBuf = new ArrayBuffer(8);
        const view = new DataView(counterBuf);
        view.setUint32(4, counter, false); // Big-endian 
        
        const key = await crypto.subtle.importKey(
            "raw", keyBuf, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", key, counterBuf);
        const hash = new Uint8Array(signature);
        
        const offset = hash[hash.length - 1] & 0x0f;
        const binary = ((hash[offset] & 0x7f) << 24) |
                       ((hash[offset + 1] & 0xff) << 16) |
                       ((hash[offset + 2] & 0xff) << 8) |
                       (hash[offset + 3] & 0xff);
        
        return (binary % 1000000).toString().padStart(6, "0");
    } catch (e) {
        return "ERROR";
    }
}

async function updateCodes() {
    chrome.storage.local.get(["accounts"], async (result) => {
        const accounts = result.accounts || {};
        const container = document.getElementById('auth-cards');
        const keys = Object.keys(accounts);

        if (keys.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#666; padding:15px; font-size:13px;">
                Ключи не найдены.<br>Нажмите правой кнопкой на иконку -> "Параметры" для добавления.
            </div>`;
            return;
        }

        // Отрисовываем карточки, если их количество изменилось
        if (container.children.length !== keys.length) {
            container.innerHTML = "";
            keys.forEach((name, index) => {
                const card = document.createElement('div');
                card.className = 'account-card';
                card.innerHTML = `
                    <div class="account-name">${name}</div>
                    <div class="account-code" id="code-${index}">------</div>
                    <div class="timer-text" id="timer-${index}">0s</div>
                    <div class="progress-bar" id="bar-${index}"></div>
                `;
                container.appendChild(card);
            });
        }

        const time_left = 30 - (Math.floor(Date.now() / 1000) % 30);

        for (let i = 0; i < keys.length; i++) {
            const name = keys[i];
            const secret = accounts[name];
            const code = await generateTOTP(secret);

            const codeEl = document.getElementById(`code-${i}`);
            const timerEl = document.getElementById(`timer-${i}`);
            const barEl = document.getElementById(`bar-${i}`);

            if (codeEl) codeEl.textContent = code;
            if (timerEl) timerEl.textContent = time_left + 'с';
            if (barEl) {
                const percent = (time_left / 30) * 100;
                barEl.style.width = percent + '%';
                barEl.style.backgroundColor = time_left <= 5 ? '#eb5757' : '#2f80ed';
                if (codeEl) codeEl.style.color = time_left <= 5 ? '#eb5757' : '#2f80ed';
            }
        }
    });
}

updateCodes();
setInterval(updateCodes, 1000);