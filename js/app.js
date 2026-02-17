// Инициализация карты
const map = L.map('map').setView(CITY_CENTER, 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap | SafeSchool Path MVP'
}).addTo(map);

// Добавляем маркеры Дома и Школы
// Добавляем маркеры
// Добавляем маркеры Начала и Конца
L.marker(locations.school).addTo(map).bindPopup("🏫 Школа (НИШ)");
L.marker(locations.mall).addTo(map).bindPopup("🛍️ AZIA MALL");

// Рисуем линии маршрутов
const fastPolyline = L.polyline(routeFast.coords, {color: 'gray', weight: 5, dashArray: '10, 10'}).addTo(map);
const safePolyline = L.polyline(routeSafe.coords, {color: '#3498db', weight: 6}).addTo(map);

// Глобальное состояние
let isNightTime = false;

// Функция обновления UI и пересчета рисков
function updateUI() {
    // Меняем текст статуса
    const timeStatus = document.getElementById('time-status');
    const toggleBtn = document.getElementById('toggle-time-btn');
    
    if (isNightTime) {
        timeStatus.innerText = "Режим: 🌙 Ночь (Включен алгоритм безопасности)";
        toggleBtn.innerText = "Переключить на День ☀️";
        document.getElementById('map').style.filter = "brightness(80%)"; // визуальный эффект ночи
    } else {
        timeStatus.innerText = "Режим: ☀️ День";
        toggleBtn.innerText = "Переключить на Ночь 🌙";
        document.getElementById('map').style.filter = "brightness(100%)";
    }

    // Запускаем движок (engine.js)
    const riskFast = calculateRisk(routeFast, isNightTime);
    const riskSafe = calculateRisk(routeSafe, isNightTime);

    // Обновляем цифры на экране
    document.getElementById('fast-risk').innerText = riskFast + "%";
    document.getElementById('safe-risk').innerText = riskSafe + "%";

    // --- ЛОГИКА ЦВЕТА И ТЕКСТА ---
    const fastRouteLabel = document.querySelector('#route-fast-info strong');
    
    // Меняем цвет опасного маршрута и ТЕКСТ
    if (riskFast > 60) {
        fastPolyline.setStyle({color: '#e74c3c'}); // Красный цвет линии
        fastRouteLabel.innerText = "Кратчайший путь (🔴 Опасно!)"; // Красный текст
        fastRouteLabel.style.color = '#e74c3c';
    } else {
        fastPolyline.setStyle({color: 'gray'}); // Серый цвет линии
        fastRouteLabel.innerText = "Кратчайший путь (Серый)"; // Черный текст
        fastRouteLabel.style.color = '#333';
    }
} 

// Обработчик кнопки День/Ночь
document.getElementById('toggle-time-btn').addEventListener('click', () => {
    isNightTime = !isNightTime; // Переключаем флаг
    updateUI(); // Перерисовываем
});

// --- ЛОГИКА СОХРАНЕНИЯ, РЕЙТИНГОВ И МЕТОК ---
const modal = document.getElementById('report-modal');
let selectedLatLng = null; 

// 1. ЗАГРУЖАЕМ СОХРАНЕННЫЕ МЕТКИ ПРИ СТАРТЕ БРАУЗЕРА
let savedReports = JSON.parse(localStorage.getItem('safeschool_reports')) || [];

// Функция отрисовки круга опасности
function drawDangerZone(lat, lng, type) {
    L.circle([lat, lng], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: 60
    }).addTo(map).bindPopup(`<b>⚠️ Сообщение:</b><br>${type}`);
}

// Рисуем старые метки на карте при загрузке страницы
savedReports.forEach(report => {
    drawDangerZone(report.lat, report.lng, report.type);
});

// 2. РАСЧЕТ РЕЙТИНГА МЕСТА
function getPlaceRating(lat, lng) {
    let threatsNearby = 0;
    savedReports.forEach(report => {
        let diffLat = Math.abs(report.lat - lat);
        let diffLng = Math.abs(report.lng - lng);
        // Проверяем наличие жалоб поблизости (примерно 500 метров)
        if (diffLat < 0.005 && diffLng < 0.005) { 
            threatsNearby++; 
        }
    });
    // Высчитываем рейтинг (из 10)
    let rating = 10 - threatsNearby;
    return rating < 0 ? 0 : rating;
}

// 3. БЫСТРЫЙ РЕПОРТ ПО КНОПКЕ SOS
document.getElementById('report-btn').addEventListener('click', () => {
    selectedLatLng = null; // Сбрасываем координаты
    document.querySelector('.modal-content h3').innerHTML = `Сообщить об угрозе:`;
    modal.classList.remove('hidden');
});

// --- РЕЖИМ РАЗРАБОТЧИКА (АКИМАТА) ---
let devMode = null; // Может быть 'cctv' или 'guard'

document.getElementById('dev-cctv-btn').addEventListener('click', () => {
    devMode = 'cctv';
    alert("🛠 Режим Акимата: Кликните на карту, чтобы установить Камеру (CCTV)");
});

document.getElementById('dev-guard-btn').addEventListener('click', () => {
    devMode = 'guard';
    alert("🛠 Режим Акимата: Кликните на карту, чтобы поставить Пост Охраны");
});

// КЛИК ПО КАРТЕ (Теперь обрабатывает и жалобы, и режим разработчика)
map.on('click', function(e) {
    // Если включен режим Разработчика - ставим инфраструктуру
    if (devMode === 'cctv') {
        L.marker(e.latlng, {
            icon: L.divIcon({html: '<div style="font-size:24px;">📹</div>', className: 'dummy', iconSize: [30,30], iconAnchor: [15,15]})
        }).addTo(map).bindPopup("<b>Система видеонаблюдения</b><br>Установлено городом").openPopup();
        
        routeFast.addedCCTV = (routeFast.addedCCTV || 0) + 1; // Улучшаем инфраструктуру
        updateUI(); // Риск падает!
        devMode = null; // Выключаем режим
        return;
    }
    
    if (devMode === 'guard') {
        L.marker(e.latlng, {
            icon: L.divIcon({html: '<div style="font-size:24px;">👮</div>', className: 'dummy', iconSize: [30,30], iconAnchor: [15,15]})
        }).addTo(map).bindPopup("<b>Пост охраны</b><br>Установлено городом").openPopup();
        
        routeFast.addedGuards = (routeFast.addedGuards || 0) + 1; // Улучшаем инфраструктуру
        updateUI(); // Риск падает!
        devMode = null;
        return;
    }

    // Если режим Разработчика ВЫКЛЮЧЕН - работает обычное меню жалоб (как раньше)
    selectedLatLng = e.latlng; 
    let placeRating = getPlaceRating(e.latlng.lat, e.latlng.lng);
    let ratingColor = placeRating > 7 ? '#27ae60' : (placeRating > 4 ? '#f39c12' : '#c0392b');

    document.querySelector('.modal-content h3').innerHTML = 
        `Рейтинг района: <span style="color:${ratingColor}">${placeRating}/10</span><br><small style="font-size: 14px; color: #7f8c8d;">Что здесь не так?</small>`;
    
    modal.classList.remove('hidden'); 
});

// 5. ЗАКРЫТИЕ МОДАЛКИ
function closeModal() {
    modal.classList.add('hidden');
    selectedLatLng = null; 
}

// --- УМНАЯ ГЕО-ЛОГИКА (Распознавание "палочек" маршрута) ---

// Вычисляет расстояние от клика до конкретного отрезка линии
function getDistanceToSegment(p, v, w) {
    let l2 = Math.pow(w.lat - v.lat, 2) + Math.pow(w.lng - v.lng, 2);
    if (l2 === 0) return p.distanceTo(v);
    let t = ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2;
    t = Math.max(0, Math.min(1, t));
    let projection = L.latLng(v.lat + t * (w.lat - v.lat), v.lng + t * (w.lng - v.lng));
    return p.distanceTo(projection); // Возвращает метры
}

// Пробегается по всем "палочками" маршрута и находит самую близкую
function getMinDistanceToRoute(latlng, routeCoords) {
    let minDist = Infinity;
    for (let i = 0; i < routeCoords.length - 1; i++) {
        let p1 = L.latLng(routeCoords[i][0], routeCoords[i][1]);
        let p2 = L.latLng(routeCoords[i+1][0], routeCoords[i+1][1]);
        let dist = getDistanceToSegment(latlng, p1, p2);
        if (dist < minDist) minDist = dist;
    }
    return minDist;
}

// 6. ОТПРАВКА И СОХРАНЕНИЕ РЕПОРТА
function submitReport(type) {
    const target = selectedLatLng ? selectedLatLng : map.getCenter();
    modal.classList.add('hidden');
    
    // Рисуем на карте
    drawDangerZone(target.lat, target.lng, type);
    
    // Сохраняем в память
    savedReports.push({ lat: target.lat, lng: target.lng, type: type });
    localStorage.setItem('safeschool_reports', JSON.stringify(savedReports));
    
    // --- ДИНАМИЧЕСКОЕ РАСПРЕДЕЛЕНИЕ РИСКА ---
    // Вычисляем, кто ближе к метке (в метрах)
    let distToFast = getMinDistanceToRoute(target, routeFast.coords);
    let distToSafe = getMinDistanceToRoute(target, routeSafe.coords);

    // Увеличиваем жалобы только у того маршрута, который ближе к опасности!
    if (distToFast < distToSafe) {
        routeFast.nearMisses += 1; // Прилетело опасному (Серому)
        console.log("Жалоба ушла на Кратчайший путь");
    } else {
        routeSafe.nearMisses += 1; // Прилетело безопасному (Синему)
        console.log("Жалоба ушла на Безопасный путь");
    }
    
    updateUI(); // Пересчитываем проценты
    selectedLatLng = null; 
}

    // --- КНОПКА СБРОСА ДЛЯ ЖЮРИ ---
document.getElementById('clear-btn').addEventListener('click', () => {
    // Спрашиваем для подстраховки, чтобы случайно не нажать во время питча
    if (confirm("Очистить все пользовательские метки и сбросить демо?")) {
        localStorage.removeItem('safeschool_reports'); // Удаляем данные из памяти браузера
        location.reload(); // Перезагружаем страницу (вернет все проценты и линии в норму)
    }
});
// Первичный запуск


// --- ЛОГИКА КНОПКИ SOS ---
document.getElementById('sos-btn').addEventListener('click', () => {
    const coords = map.getCenter(); // Берем текущий центр экрана как место происшествия
    
    // Имитация звонка (для мобильных устройств)
    if (/Android|iPhone/i.test(navigator.userAgent)) {
        if (confirm("Вызвать полицию 102 и отправить ваши координаты?")) {
            window.location.href = "tel:102";
        }
    } else {
        // Для презентации на ноуте делаем красивый эффект
        alert(`🚨 СИГНАЛ SOS ОТПРАВЛЕН!\n\nВаши координаты: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}\nЭкипаж полиции Уральска выехал на место.`);
        
        // Ставим на карту специальный маркер SOS
        L.marker(coords, {
            icon: L.divIcon({
                html: '<div style="font-size:30px; animation: pulse-red 1s infinite;">🚨</div>', 
                className: 'dummy', 
                iconSize: [40, 40], 
                iconAnchor: [20, 20]
            })
        }).addTo(map).bindPopup("<b>ТРЕВОГА: ВЫЗОВ ПОЛИЦИИ</b>").openPopup();
    }
});
updateUI();