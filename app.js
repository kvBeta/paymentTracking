const STORAGE_KEY = 'expenseTrackerData';

let data = {
    members: [],
    expenses: []
};

const currencyFormatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
});

function formatCurrency(amount) {
    return currencyFormatter.format(amount);
}

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
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.textContent = name;
        const rm = document.createElement('button');
        rm.innerHTML = '<i class="bi bi-trash"></i>';
        rm.className = 'btn btn-sm btn-outline-danger';
        rm.title = 'Remove';
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
        li.className = 'list-group-item d-flex justify-content-between align-items-start';

        const info = document.createElement('div');
        info.innerHTML = `<strong>${exp.description}</strong><br>
            <small>${formatCurrency(exp.amount)} paid by ${exp.payer} – <span class="text-muted">${new Date(exp.time).toLocaleString()}</span></small>`;
        const rm = document.createElement('button');
        rm.className = 'btn btn-sm btn-outline-danger';
        rm.innerHTML = '<i class="bi bi-trash"></i>';
        rm.onclick = () => {
            data.expenses.splice(index,1);
            saveData();
            renderAll();
        };
        li.appendChild(info);
        li.appendChild(rm);
        list.appendChild(li);
    });
}

function renderSummary() {
    const tbody = document.querySelector('#summary-table tbody');
    const summaryText = document.getElementById('summary-text');
    tbody.innerHTML = '';
    summaryText.textContent = '';
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
        transactions.push({from: debtor.name, to: creditor.name, amount: amt});
        debtor.bal -= amt;
        creditor.bal -= amt;
        if (debtor.bal < 0.01) i++;
        if (creditor.bal < 0.01) j++;
    }

    if (transactions.length === 0) {
        const row = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.textContent = 'All settled!';
        row.appendChild(td);
        tbody.appendChild(row);
    } else {
        transactions.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${t.from}</td><td class="text-center"><i class="bi bi-arrow-right"></i></td><td>${t.to}</td><td class="text-end">${formatCurrency(t.amount)}</td>`;
            tbody.appendChild(tr);
        });
        summaryText.textContent = transactions.map(t => `${t.from} should send ${formatCurrency(t.amount)} to ${t.to}`).join('. ') + '.';
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
        const rawAmount = document.getElementById('expense-amount').value.replace(',', '.');
        const amount = parseFloat(rawAmount);
        const payer = document.getElementById('expense-payer').value;
        const participants = Array.from(document.querySelectorAll('#participants-options input:checked')).map(cb=>cb.value);
        if (!desc || isNaN(amount) || amount<=0 || !payer || participants.length===0) return;
        data.expenses.push({description: desc, amount, payer, participants, time: Date.now()});
        saveData();
        renderAll();
        document.getElementById('expense-desc').value = '';
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-desc').focus();
    };

    document.getElementById('save-btn').onclick = saveData;
    document.getElementById('clear-btn').onclick = () => {
        if (confirm('Clear all data?')) {
            localStorage.removeItem(STORAGE_KEY);
            data = {members: [], expenses: []};
            renderAll();
        }
    };
}

document.addEventListener('DOMContentLoaded', init);
