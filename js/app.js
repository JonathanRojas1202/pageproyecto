// ⚠️ INSTRUCCIÓN: Pega aquí la URL web de tu Google Apps Script desplegado
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz28CvPU-nRmBC10C3zPbZ7IF2ZM9uWoCdb52mTbSuU_VcInNfVyCvMKL_wlUXMsuxn/exec';
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
    const loadingMsg = document.getElementById('loadingMsg');

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

        emotionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const payload = {
                estudiante: studentNameInput.value.trim(),
                emocion: selectedEmotionInput.value,
                puntuacion: parseInt(scoreRange.value)
            };

            emotionForm.classList.add('hidden');
            loadingMsg.classList.remove('hidden');

            try {
                await fetch(WEB_APP_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                loadingMsg.classList.add('hidden');
                successMsg.classList.remove('hidden');

                setTimeout(() => {
                    emotionForm.reset();
                    emotionBtns.forEach(b => b.classList.remove('selected'));
                    selectedEmotionInput.value = '';
                    rangeValue.textContent = '5';
                    submitBtn.setAttribute('disabled', 'true');
                    successMsg.classList.add('hidden');
                    emotionForm.classList.remove('hidden');
                }, 4000);

            } catch (error) {
                console.error('Error:', error);
                alert('Hubo un error al enviar el registro. Verifica tu conexión.');
                loadingMsg.classList.add('hidden');
                emotionForm.classList.remove('hidden');
            }
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
                loadDashboardData();
            } else {
                pinError.classList.remove('hidden');
                pinInput.value = '';
            }
        });
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboardData);
    }
});

async function loadDashboardData() {
    const loadingDashboard = document.getElementById('loadingDashboard');
    const actualDashboard = document.getElementById('actualDashboard');

    loadingDashboard.classList.remove('hidden');
    actualDashboard.classList.add('hidden');

    try {
        const response = await fetch(WEB_APP_URL);
        const records = await response.json();

        document.getElementById('totalRecords').textContent = records.length;

        if (records.length > 0) {
            const sum = records.reduce((acc, curr) => acc + parseInt(curr.puntuacion), 0);
            const avg = (sum / records.length).toFixed(1);
            document.getElementById('avgScore').textContent = `${avg} / 10`;
        } else {
            document.getElementById('avgScore').textContent = 'Sin datos';
        }

        // Tabla
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

        renderCharts(records);

        loadingDashboard.classList.add('hidden');
        actualDashboard.classList.remove('hidden');

    } catch (error) {
        console.error('Error al cargar datos:', error);
        loadingDashboard.innerHTML = '<p style="color: red;">Error al conectar con Google Sheets. Asegúrate de haber publicado correctamente el script de Apps Script.</p>';
    }
}

let emotionChartInstance = null;
let scoreChartInstance = null;

function renderCharts(records) {
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

    const scoreCounts = { '1-2': 0, '3-4': 0, '5-6': 0, '7-8': 0, '9-10': 0 };
    records.forEach(r => {
        const s = parseInt(r.puntuacion);
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
