const STORAGE_KEY = 'registros_emocionales_v2';
const PIN_ORIENTADOR = '1234';

document.addEventListener('DOMContentLoaded', () => {
    // Vista Estudiante
    const emotionBtns = document.querySelectorAll('.emotion-btn');
    const selectedEmotionInput = document.getElementById('selectedEmotion');
    const studentNameInput = document.getElementById('studentName');
    const scoreRange = document.getElementById('scoreRange');
    const rangeValue = document.getElementById('rangeValue');
    const submitBtn = document.getElementById('submitBtn');
    const emotionForm = document.getElementById('emotionForm');
    const successMsg = document.getElementById('successMsg');

    if (emotionBtns.length > 0) {
        emotionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                emotionBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedEmotionInput.value = btn.dataset.emotion;
                checkForm();
            });
        });

        scoreRange.addEventListener('input', () => {
            rangeValue.textContent = scoreRange.value;
        });

        studentNameInput.addEventListener('input', checkForm);

        function checkForm() {
            if (studentNameInput.value.trim() !== '' && selectedEmotionInput.value !== '') {
                submitBtn.removeAttribute('disabled');
            } else {
                submitBtn.setAttribute('disabled', 'true');
            }
        }

        emotionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            
            const newRecord = {
                fecha: new Date().toLocaleString(),
                estudiante: studentNameInput.value.trim(),
                emocion: selectedEmotionInput.value,
                puntuacion: parseInt(scoreRange.value)
            };

            records.unshift(newRecord);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

            emotionForm.classList.add('hidden');
            successMsg.classList.remove('hidden');

            setTimeout(() => {
                emotionForm.reset();
                emotionBtns.forEach(b => b.classList.remove('selected'));
                selectedEmotionInput.value = '';
                rangeValue.textContent = '5';
                submitBtn.setAttribute('disabled', 'true');
                successMsg.classList.add('hidden');
                emotionForm.classList.remove('hidden');
            }, 3000);
        });
    }

    // Vista Orientador
    const pinForm = document.getElementById('pinForm');
    if (pinForm) {
        const pinInput = document.getElementById('pinInput');
        const pinModal = document.getElementById('pinModal');
        const pinError = document.getElementById('pinError');
        const dashboardContent = document.getElementById('dashboardContent');

        pinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (pinInput.value === PIN_ORIENTADOR) {
                pinModal.classList.add('hidden');
                dashboardContent.classList.remove('hidden');
                loadDashboard();
            } else {
                pinError.classList.remove('hidden');
                pinInput.value = '';
            }
        });
    }
});

function loadDashboard() {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    
    document.getElementById('totalRecords').textContent = records.length;

    if (records.length > 0) {
        const sum = records.reduce((acc, curr) => acc + curr.puntuacion, 0);
        const avg = (sum / records.length).toFixed(1);
        document.getElementById('avgScore').textContent = `${avg} / 10`;
    } else {
        document.getElementById('avgScore').textContent = 'Sin datos';
    }

    // Renderizar Tabla
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay registros disponibles.</td></tr>';
    } else {
        records.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.fecha}</td>
                <td>${escapeHTML(r.estudiante)}</td>
                <td><b>${r.emocion}</b></td>
                <td>${r.puntuacion} / 10</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Renderizar Gráficos (Chart.js)
    renderCharts(records);

    // Exportar CSV
    const exportBtn = document.getElementById('exportBtn');
    exportBtn.onclick = () => {
        if (records.length === 0) {
            alert('No hay datos para exportar.');
            return;
        }
        let csv = 'Fecha,Estudiante,Emocion,Puntuacion\n';
        records.forEach(r => {
            csv += `"${r.fecha}","${r.estudiante}","${r.emocion}",${r.puntuacion}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'registros_emocionales.csv';
        a.click();
    };
}

let emotionChartInstance = null;
let scoreChartInstance = null;

function renderCharts(records) {
    // 1. Gráfico de Emociones (Pastel / Doughnut)
    const emotionCounts = { 'Feliz': 0, 'Tranquilo': 0, 'Neutral': 0, 'Triste': 0, 'Estresado': 0 };
    records.forEach(r => {
        if (emotionCounts[r.emocion] !== undefined) {
            emotionCounts[r.emocion]++;
        }
    });

    const ctxEmotion = document.getElementById('emotionChart').getContext('2d');
    if (emotionChartInstance) emotionChartInstance.destroy();
    
    emotionChartInstance = new Chart(ctxEmotion, {
        type: 'doughnut',
        data: {
            labels: Object.keys(emotionCounts),
            datasets: [{
                data: Object.values(emotionCounts),
                backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e67e22', '#e74c3c'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // 2. Gráfico de Puntuaciones de Bienestar (Barra)
    const scoreCounts = { '1-2': 0, '3-4': 0, '5-6': 0, '7-8': 0, '9-10': 0 };
    records.forEach(r => {
        const s = r.puntuacion;
        if (s <= 2) scoreCounts['1-2']++;
        else if (s <= 4) scoreCounts['3-4']++;
        else if (s <= 6) scoreCounts['5-6']++;
        else if (s <= 8) scoreCounts['7-8']++;
        else scoreCounts['9-10']++;
    });

    const ctxScore = document.getElementById('scoreChart').getContext('2d');
    if (scoreChartInstance) scoreChartInstance.destroy();

    scoreChartInstance = new Chart(ctxScore, {
        type: 'bar',
        data: {
            labels: Object.keys(scoreCounts),
            datasets: [{
                label: 'Cantidad de estudiantes',
                data: Object.values(scoreCounts),
                backgroundColor: '#4a90e2',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
