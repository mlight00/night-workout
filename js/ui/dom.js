// 화면 전환과 작은 DOM 도우미. 화면을 만지는 코드는 ui/ 아래에만 둔다.

export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const stack = ['home'];
const listeners = {};

export function show(name, { replace = false } = {}) {
  if (replace) stack[stack.length - 1] = name;
  else if (stack.at(-1) !== name) stack.push(name);
  for (const el of document.querySelectorAll('.screen')) el.classList.toggle('is-active', el.id === `screen-${name}`);
  window.scrollTo(0, 0);
  (listeners[name] || []).forEach((f) => f());
}

export function back() {
  if (stack.length > 1) stack.pop();
  show(stack.at(-1), { replace: true });
}

export function home() {
  stack.length = 1;
  show('home', { replace: true });
}

export const current = () => stack.at(-1);
export const onShow = (name, f) => (listeners[name] ||= []).push(f);

export function wireBackButtons() {
  for (const b of document.querySelectorAll('button.back')) b.addEventListener('click', back);
}
