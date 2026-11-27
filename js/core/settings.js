// إعدادات اللاعب المحفوظة
export const Settings = {
  data: { vol: 0.5, sens: 1 },
  load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem('taxi2am') || '{}')); } catch (e) {} },
  save() { try { localStorage.setItem('taxi2am', JSON.stringify(this.data)); } catch (e) {} }
};
