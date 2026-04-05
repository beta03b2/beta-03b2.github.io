/**
 * script.js
 * MCBE ダメージ逆算ツール
 */

const calcBtn = document.getElementById('calcBtn');
const status = document.getElementById('status');
const errorMsg = document.getElementById('error-msg');
const resultGrid = document.getElementById('resultGrid');

// 多言語リソース
const i18n = {
    ja: {
        title: "MCBE ダメージ逆算ツール",
        labelBase: "基礎攻撃力 (Base Attack)",
        labelTarget: "目標ダメージ (Target Damage)",
        labelCrit: "クリティカルヒット (x1.5)",
        btnCalc: "最適な組み合わせを計算",
        statusCalc: "計算中...",
        p1Title: "【1】目標に最も近い数値",
        p2Title: "【2】目標以上で最も近い数値",
        orderLabel: "計算順序:",
        orderVal: "基礎 → Strength → Weakness → Critical",
        mobNotice: "MOBからプレイヤーに与えるダメージを計算する場合は、難易度によって変化するため、正しく計算が出来ない場合があります。",
        footerPre: "このサイトは",
        footerPost: "及び、Google Geminiによって作成されました。",
        errorInvalid: "数値を正しく入力してください。",
        errorBase: "基礎攻撃力には0より大きい数値を入力してください。",
        errorTarget: "目標ダメージには0以上の数値を入力してください。",
        none: "なし",
        unreachable: "到達不可",
        errorLabel: "誤差"
    },
    en: {
        title: "MCBE Damage Reverse Calculator",
        labelBase: "Base Attack",
        labelTarget: "Target Damage",
        labelCrit: "Critical Hit (x1.5)",
        btnCalc: "Calculate Best Match",
        statusCalc: "Calculating...",
        p1Title: "[1] Closest to Target",
        p2Title: "[2] Closest ≥ Target",
        orderLabel: "Order:",
        orderVal: "Base → Strength → Weakness → Critical",
        mobNotice: "When calculating damage dealt by mobs to players, correct calculations may not be possible as it varies by difficulty.",
        footerPre: "Created by ",
        footerPost: " and Google Gemini.",
        errorInvalid: "Please enter valid numbers.",
        errorBase: "Base Attack must be greater than 0.",
        errorTarget: "Target Damage must be 0 or more.",
        none: "None",
        unreachable: "Unreachable",
        errorLabel: "Error"
    }
};

const lang = navigator.language.startsWith('ja') ? 'ja' : 'en';
const t = i18n[lang];

function applyLanguage() {
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-label-base').innerText = t.labelBase;
    document.getElementById('ui-label-target').innerText = t.labelTarget;
    document.getElementById('ui-label-crit').innerText = t.labelCrit;
    calcBtn.innerText = t.btnCalc;
    document.getElementById('ui-p1-title').innerText = t.p1Title;
    document.getElementById('ui-p2-title').innerText = t.p2Title;
    document.getElementById('ui-order-label').innerText = t.orderLabel;
    document.getElementById('ui-order-val').innerText = t.orderVal;
    document.getElementById('ui-footer-text').innerText = t.footerPre;
    document.getElementById('ui-footer-gemini').innerText = t.footerPost;
    
    const mobNoticeEl = document.getElementById('ui-mob-notice');
    if (mobNoticeEl) mobNoticeEl.innerText = t.mobNotice;
}
applyLanguage();

function simulate(baseAtk, strLv, wkWv, isCrit) {
    let current = Math.fround(baseAtk);

    if (strLv >= 1) {
        const strMult = Math.fround(1.3);
        const strPlus = Math.fround(1.0);
        for (let i = 0; i <= strLv; i++) {
            current = Math.fround(current * strMult);
            current = Math.fround(current + strPlus);
        }
    }

    if (wkWv >= 1) {
        const wkMult = Math.fround(0.8);
        const wkMinus = Math.fround(0.5);
        for (let i = 0; i <= wkWv; i++) {
            current = Math.fround(current * wkMult - wkMinus);
        }
    }

    if (isCrit) {
        current = Math.fround(current * Math.fround(1.5));
    }

    return current <= 0 ? 0 : current;
}

calcBtn.addEventListener('click', () => {
    errorMsg.innerText = "";
    resultGrid.style.display = 'none';

    const baseRaw = document.getElementById('baseAtk').value;
    const targetRaw = document.getElementById('targetDmg').value;
    const isCrit = document.getElementById('isCritical').checked;

    if (!baseRaw || !targetRaw || isNaN(parseFloat(baseRaw)) || isNaN(parseFloat(targetRaw))) {
        errorMsg.innerText = t.errorInvalid;
        return;
    }

    const baseAtk = parseFloat(baseRaw);
    const targetDmg = parseFloat(targetRaw);

    if (baseAtk <= 0) { errorMsg.innerText = t.errorBase; return; }
    if (targetDmg < 0) { errorMsg.innerText = t.errorTarget; return; }

    calcBtn.disabled = true;
    status.innerText = t.statusCalc;

    setTimeout(() => {
        let p1BestDiff = Infinity, p1Res = 0, p1Str = -1, p1Wk = -1;
        let p2BestDiff = Infinity, p2Res = 0, p2Str = -1, p2Wk = -1;

        const levels = [-1]; 
        for (let l = 0; l <= 254; l++) levels.push(l);

        for (const s of levels) {
            for (const w of levels) {
                const res = simulate(baseAtk, s, w, isCrit);
                const d1 = Math.abs(res - targetDmg);
                if (d1 < p1BestDiff) {
                    p1BestDiff = d1; p1Res = res; p1Str = s; p1Wk = w;
                }
                if (res >= targetDmg) {
                    const d2 = res - targetDmg;
                    if (d2 < p2BestDiff) {
                        p2BestDiff = d2; p2Res = res; p2Str = s; p2Wk = w;
                    }
                }
            }
        }

        displayResult('p1', p1Res, p1Str, p1Wk, targetDmg);
        if (p2BestDiff === Infinity) {
            document.getElementById('p2_val').innerText = t.unreachable;
            document.getElementById('p2_err').innerText = "-";
            document.getElementById('p2_str').innerText = "-";
            document.getElementById('p2_wk').innerText = "-";
        } else {
            displayResult('p2', p2Res, p2Str, p2Wk, targetDmg);
        }

        resultGrid.style.display = 'grid';
        status.innerText = "";
        calcBtn.disabled = false;
    }, 50);
});

function displayResult(prefix, val, str, wk, target) {
    const diff = val - target;
    const diffSign = diff >= 0 ? "+" : "";
    document.getElementById(`${prefix}_val`).innerText = val.toLocaleString();
    document.getElementById(`${prefix}_err`).innerText = `${t.errorLabel}: ${diffSign}${diff.toLocaleString()}`;
    document.getElementById(`${prefix}_str`).innerText = str === -1 ? t.none : (str + 1);
    document.getElementById(`${prefix}_wk`).innerText = wk === -1 ? t.none : (wk + 1);
}
