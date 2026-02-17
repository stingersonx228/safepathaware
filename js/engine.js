// engine.js - Инфраструктура (Акимат) против Жалоб (Люди)

function calculateRisk(route, isNight) {
    let risk = 10; // База днем (абсолютно нормально)

    // 1. СТАТИЧЕСКИЕ ПРОБЛЕМЫ (почему днем риск не 5%, а 25%)
    if (route.hasAbandoned) risk += 15; // Гаражи портят рейтинг даже днем
    
    // 2. ВРЕМЯ СУТОК
    if (isNight) {
        risk += 15; // Стало темно
        if (!route.isLit) risk += 20; // Нет фонарей - еще хуже
    }

    // 3. ЖАЛОБЫ ЛЮДЕЙ (Краудсорсинг - жестко повышает риск)
    // Если тут будет 0, риск не поднимется. Если 1 жалоба = +20% к риску.
    risk += (route.nearMisses * 20);

    // 4. РЕШЕНИЯ АКИМАТА / РАЗРАБОТЧИКА (Снижают риск)
    // Динамически добавленные камеры и охрана
    if (route.addedCCTV) risk -= (route.addedCCTV * 15);
    if (route.addedGuards) risk -= (route.addedGuards * 25); 

    // Лимиты
    if (risk < 5) risk = 5;
    if (risk > 95) risk = 95;

    return Math.round(risk);
}