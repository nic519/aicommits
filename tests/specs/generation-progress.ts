import { testSuite, expect } from 'manten';
import { setTimeout as delay } from 'node:timers/promises';
import { startGenerationProgress } from '../../src/feature/generation-progress.js';

export default testSuite(({ test }) => {
	test('keeps timing during silence and stops updates after failure', async () => {
		const messages: string[] = [];
		const stops: { message: string; code?: number }[] = [];
		const progress = startGenerationProgress({
			start: (message) => messages.push(message),
			message: (message) => messages.push(message),
			stop: (message, code) => { stops.push({ message, code }); },
		}, { locale: 'zh-CN', provider: 'Codex', count: 1 });
		try {
			progress.update(0, { stage: 'waiting' });
			await delay(250);
			expect(messages.length).toBeGreaterThan(1);
			expect(messages[messages.length - 1]).toMatch('等待响应');
			expect(messages[messages.length - 1]).not.toMatch('0.0s');
		} finally {
			progress.stop(false);
		}
		const count = messages.length;
		progress.update(0, { stage: 'receiving' });
		progress.stop(true);
		await delay(150);
		expect(messages.length).toBe(count);
		expect(stops.length).toBe(1);
		expect(stops[0].code).toBe(1);
		expect(stops[0].message).toMatch('生成失败');
	});

	test('displays the remaining candidate after another finishes', async () => {
		const messages: string[] = [];
		const progress = startGenerationProgress({
			start: (message) => messages.push(message),
			message: (message) => messages.push(message),
			stop: (message) => messages.push(message),
		}, { locale: 'en', provider: 'OpenAI', count: 2 });
		try {
			progress.update(0, { stage: 'validating' });
			progress.complete(0);
			progress.update(1, { stage: 'receiving' });
			await delay(150);
			expect(messages[messages.length - 1]).toMatch('Receiving AI response');
			expect(messages[messages.length - 1]).toMatch('1/2');
		} finally {
			progress.stop(true);
		}
		expect(messages[messages.length - 1]).toMatch('Generation completed');
	});
});
