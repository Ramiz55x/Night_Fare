# تاكسي 2:00 فجراً (Taxi 2AM)
لعبة رعب 3D بـ Three.js. كل الرسومات والأزرار والأصوات تُولَّد بالكود.

## التشغيل
- GitHub Pages: Settings → Pages → Branch: main / root، ثم افتح الرابط.
- محلياً (لا يعمل بالنقر المزدوج لأنه يستخدم ES Modules): `python -m http.server` ثم http://localhost:8000
- لاحقاً APK: Capacitor (`npx cap add android`).

## الشجرة
index.html            الصفحة + importmap لـ three
css/style.css         أنماط الواجهة
js/main.js            نقطة الدخول (يربط كل شيء)
js/core/game.js       مدير المراحل: load / restart / fail / win + حلقة اللعب
js/core/ui.js         القوائم + التحكم (لوحة المفاتيح والماوس مخفية، أزرار اللمس للموبايل فقط)
js/core/settings.js   إعدادات محفوظة (صوت، حساسية)
js/core/audio.js      أصوات Web Audio (محرك، نقرة)
js/core/utils.js      مساعدات مجسمات (box, mat)
js/vehicle/taxi.js    التاكسي + الفيزياء + نظر الرأس الحر
js/levels/index.js    سجل المراحل
js/levels/level01.js  المرحلة 1 (عالم مفتوح بلا وحش)

## إضافة مرحلة
1. انسخ level01.js باسم level02.js وغيّر id والخريطة والإضاءة.
2. أضف الوحش في update() واستدعِ game.fail('سبب') عند المخالفة (يعيد المرحلة من البداية).
3. أضفها في js/levels/index.js.

## التحكم (كمبيوتر)
W/S أو الأسهم قيادة، A/D توجيه، Space فرامل، الماوس نظر، R إعادة المرحلة، Esc قائمة.
