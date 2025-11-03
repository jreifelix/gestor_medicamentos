document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderCategoryTabs();
    renderProducts();
    setupEventListeners();
});

let stockData = {
    products: []
};

const categories = ["Criança", "Adulto", "Ambos"];
let currentCategoryFilter = 'all';

function setupEventListeners() {
    document.getElementById('addProductBtn').addEventListener('click', openAddModal);
    document.getElementById('productForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput').addEventListener('input', (e) => renderProducts(currentCategoryFilter, e.target.value));
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);
    document.getElementById('importInput').addEventListener('change', handleImportFile);
}

function renderCategoryTabs() {
    const tabsContainer = document.getElementById('categoryTabs');
    tabsContainer.innerHTML = `<button class="tab-btn active" data-category="all">Todas</button>`;
    categories.forEach(category => {
        tabsContainer.innerHTML += `<button class="tab-btn" data-category="${category}">${category}</button>`;
    });

    tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            tabsContainer.querySelector('.active').classList.remove('active');
            btn.classList.add('active');
            currentCategoryFilter = btn.dataset.category;
            renderProducts(currentCategoryFilter, document.getElementById('searchInput').value);
        });
    });
}

function renderProducts(category = 'all', searchTerm = '') {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '';

    let filteredProducts = stockData.products;
    if (category !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === category);
    }
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filteredProducts.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">Nenhum medicamento encontrado.</p>`;
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';

        const expiryDate = product.expiryDate ? new Date(product.expiryDate) : null;
        
        // Lógica de Alertas Visuais
        if (expiryDate && expiryDate < today) {
            card.classList.add('stock-expired'); // Expirado tem prioridade máxima
        } else if (product.quantity <= 0) {
            card.classList.add('stock-critical');
        }

        const expiryDateString = expiryDate 
            ? `Validade: ${expiryDate.toLocaleDateString('pt-PT')}` 
            : 'Validade: N/A';

        card.innerHTML = `
            <div class="product-card-content">
                <div class="product-header">
                    <h4 class="product-name">${product.name}</h4>
                    <span class="product-category">${product.category}</span>
                </div>
                <div class="product-body">
                    <span class="product-stock">${product.quantity}</span>
                    <p class="product-type">Tipo: ${product.type} | ${expiryDateString}</p>
                </div>
                <div class="product-actions">
                    <button class="btn secondary icon-btn" onclick="updateStock('${product.id}', -1, event)"><i class="fas fa-minus"></i></button>
                    <button class="btn secondary icon-btn" onclick="updateStock('${product.id}', 1, event)"><i class="fas fa-plus"></i></button>
                    <button class="btn secondary" onclick="editProduct('${product.id}', event)"><i class="fas fa-edit"></i> Editar</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}
function openAddModal() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('modalTitle').textContent = 'Adicionar Novo Medicamento';
    openModal('productModal');
}

function editProduct(id, event) {
    event.stopPropagation();
    const product = stockData.products.find(p => p.id === id);
    if (product) {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productType').value = product.type;
        document.getElementById('productQuantity').value = product.quantity;
        // Preenche o campo da data de validade
        document.getElementById('productExpiryDate').value = product.expiryDate || '';
        document.getElementById('modalTitle').textContent = 'Editar Medicamento';
        openModal('productModal');
    }
}

function updateStock(id, amount, event) {
    event.stopPropagation();
    const product = stockData.products.find(p => p.id === id);
    if (product) {
        product.quantity = Math.max(0, product.quantity + amount);
        saveData();
        renderProducts(currentCategoryFilter, document.getElementById('searchInput').value);
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        type: document.getElementById('productType').value,
        quantity: parseFloat(document.getElementById('productQuantity').value),
        // Adiciona a data de validade ao objeto
        expiryDate: document.getElementById('productExpiryDate').value
    };

    if (id) {
        const index = stockData.products.findIndex(p => p.id === id);
        stockData.products[index] = { ...stockData.products[index], ...productData };
    } else {
        productData.id = `med_${new Date().getTime()}`;
        stockData.products.push(productData);
    }

    saveData();
    renderProducts(currentCategoryFilter, document.getElementById('searchInput').value);
    closeModal('productModal');
}

function exportToExcel() {
    if (stockData.products.length === 0) {
        alert("Não há medicamentos para exportar.");
        return;
    }
    // Adiciona a nova coluna "Data de Validade"
    const headers = ["ID", "Nome do Medicamento", "Categoria", "Tipo", "Quantidade", "Data de Validade"];
    const rows = stockData.products.map(p => [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        p.type,
        p.quantity,
        p.expiryDate || '' // Adiciona a data ou uma string vazia
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventario_medicamentos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedProducts = parseCSV(e.target.result);
            const confirmed = confirm(`Foram encontrados ${importedProducts.length} medicamentos. Deseja substituir o seu inventário atual?`);
            if (confirmed) {
                stockData.products = importedProducts;
                saveData();
                renderProducts();
                alert("Inventário importado com sucesso!");
            }
        } catch (error) {
            alert("Erro ao processar o ficheiro: " + error.message);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines.shift().split(',').map(h => h.trim());
    // Adiciona o novo cabeçalho esperado
    const expectedHeaders = ["ID", "Nome do Medicamento", "Categoria", "Tipo", "Quantidade", "Data de Validade"];
    if (headers.length !== expectedHeaders.length || !headers.every((h, i) => h === expectedHeaders[i])) {
        throw new Error("Formato do ficheiro CSV inválido ou cabeçalhos não correspondem.");
    }
    return lines.map(line => {
        if (!line.trim()) return null;
        const values = line.split(',');
        return {
            id: `med_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`,
            name: values[1] ? values[1].replace(/"/g, '') : '',
            category: values[2] || 'Ambos',
            type: values[3] || 'Outros',
            quantity: parseFloat(values[4]) || 0,
            // Adiciona a data de validade ao objeto importado
            expiryDate: values[5] || ''
        };
    }).filter(p => p !== null);
}
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function saveData() { localStorage.setItem('medication_stock_data', JSON.stringify(stockData)); }
function loadData() {
    const data = localStorage.getItem('medication_stock_data');
    if (data) stockData = JSON.parse(data);
}
