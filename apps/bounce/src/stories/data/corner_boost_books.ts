// Real corner_boost-mode books sampled from the math-sdk publish files, picked
// to cover every round shape (plain / corner / chain / mine death) plus the
// mode's wincap book. Kept as JSON — large TS literals go through Vite's TS
// transform, which OOMs on big files.
import books from './corner_boost_books.json';

export default books;
