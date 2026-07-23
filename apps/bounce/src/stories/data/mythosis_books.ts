// Real mythosis-mode books sampled from the math-sdk publish files, picked to
// cover every round shape (plain / corner / chain / mine death / mythosis
// split) plus the mode's wincap book. Kept as JSON — large TS literals go
// through Vite's TS transform, which OOMs on big files.
import books from './mythosis_books.json';

export default books;
