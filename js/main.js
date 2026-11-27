// نقطة الدخول: تربط الأنظمة ببعضها
import { Settings } from './core/settings.js';
import { Game } from './core/game.js';
import { UI } from './core/ui.js';
import { levels } from './levels/index.js';

Settings.load();
const game = new Game();
levels.forEach(l => game.register(l));
game.load(levels[0].id);
UI.init(game);
game.start();
