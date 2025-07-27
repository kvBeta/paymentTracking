const STORAGE_KEY = 'expenseTrackerData';

let data = {
    members: [],
    expenses: []
};

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        data = JSON.parse(saved);
    }
}

function renderMembers() {
    const list = document.getElementById('member-list');
    list.innerHTML = '';
    data.members.forEach((name, index) => {
        const li = document.createElement('li');
        li.textContent = name;
        const rm = document.createElement('button');
        rm.textContent = 'Remove';
        rm.className = 'remove-btn';
        rm.onclick = () => {
            data.members.splice(index,1);
            // Remove expenses involving this member
            data.expenses = data.expenses.filter(e => e.payer !== name && e.participants.indexOf(name) === -1);
            saveData();
            renderAll();
        };
        li.appendChild(rm);
        list.appendChild(li);
    });
    updateMemberOptions();
}

function updateMemberOptions() {
    const payerSelect = document.getElementById('expense-payer');
    const participantsDiv = document.getElementById('participants-options');
    payerSelect.innerHTML = '';
    participantsDiv.innerHTML = '';
    data.members.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        payerSelect.appendChild(opt);

        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = name;
        cb.checked = true;
        label.appendChild(cb);
        label.append(' ' + name);
        participantsDiv.appendChild(label);
    });
}

function renderExpenses() {
    const list = document.getElementById('expense-list');
    list.innerHTML = '';
    data.expenses.forEach((exp, index) => {
        const li = document.createElement('li');
        li.textContent = `${exp.description} - $${exp.amount.toFixed(2)} paid by ${exp.payer}`;
        const rm = document.createElement('button');
        rm.textContent = 'Remove';
        rm.className = 'remove-btn';
        rm.onclick = () => {
            data.expenses.splice(index,1);
            saveData();
            renderAll();
        };
        li.appendChild(rm);
        list.appendChild(li);
    });
}

function renderSummary() {
    const summaryList = document.getElementById('summary-list');
    summaryList.innerHTML = '';
    if (data.members.length === 0) return;

    const totals = {};
    data.members.forEach(m => totals[m] = 0);
    data.expenses.forEach(exp => {
        const share = exp.amount / exp.participants.length;
        exp.participants.forEach(p => {
            if (p === exp.payer) {
                totals[p] += exp.amount - share;
            } else {
                totals[p] -= share;
                totals[exp.payer] += share;
            }
        });
    });

    const creditors = [];
    const debtors = [];
    for (const [name, bal] of Object.entries(totals)) {
        if (bal > 0.01) creditors.push({name, bal});
        else if (bal < -0.01) debtors.push({name, bal: -bal});
    }
    creditors.sort((a,b)=>b.bal-a.bal);
    debtors.sort((a,b)=>b.bal-a.bal);

    const transactions = [];
    let i=0,j=0;
    while (i<debtors.length && j<creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const amt = Math.min(debtor.bal, creditor.bal);
        transactions.push(`${debtor.name} owes ${creditor.name} $${amt.toFixed(2)}`);
        debtor.bal -= amt;
        creditor.bal -= amt;
        if (debtor.bal < 0.01) i++;
        if (creditor.bal < 0.01) j++;
    }

    if (transactions.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'All settled!';
        summaryList.appendChild(li);
    } else {
        transactions.forEach(t => {
            const li = document.createElement('li');
            li.textContent = t;
            summaryList.appendChild(li);
        });
    }
}

function renderAll() {
    renderMembers();
    renderExpenses();
    renderSummary();
}

function init() {
    loadData();
    renderAll();

    document.getElementById('add-member-form').onsubmit = e => {
        e.preventDefault();
        const name = document.getElementById('member-name').value.trim();
        if (name && !data.members.includes(name)) {
            data.members.push(name);
            saveData();
            renderAll();
            document.getElementById('member-name').value = '';
        }
    };

    document.getElementById('add-expense-form').onsubmit = e => {
        e.preventDefault();
        const desc = document.getElementById('expense-desc').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const payer = document.getElementById('expense-payer').value;
        const participants = Array.from(document.querySelectorAll('#participants-options input:checked')).map(cb=>cb.value);
        if (!desc || isNaN(amount) || amount<=0 || !payer || participants.length===0) return;
        data.expenses.push({description: desc, amount, payer, participants});
        saveData();
        renderAll();
        document.getElementById('expense-desc').value = '';
        document.getElementById('expense-amount').value = '';
    };
}

document.addEventListener('DOMContentLoaded', init);
