// @ts-ignore
import config from 'config-vite';

import { mockRgs } from './mock-rgs/plugin.js';

const base = config();

export default {
	...base,
	plugins: [...base.plugins, mockRgs()],
};
