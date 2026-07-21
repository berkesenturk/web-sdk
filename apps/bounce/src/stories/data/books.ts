// 30 real normal-mode books sampled from the math-sdk publish files (see
// mock-rgs/plugin.js for the live sampling the dev server does). Kept as JSON —
// large TS literals go through Vite's TS transform, which OOMs on big files.
import books from './books.json';

export default books;
