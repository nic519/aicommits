export type GenerationProgress = {
	stage: 'reading-diff' | 'waiting' | 'waiting-complete' | 'thinking' | 'receiving' | 'tool' | 'validating';
};

export type OnGenerationProgress = (event: GenerationProgress) => void;

type ProgressSpinner = {
	start: (message: string) => void;
	message: (message: string) => void;
	stop: (message: string, code?: number) => void;
};

/** One display per generation attempt, including concurrent candidates. */
export const startGenerationProgress = (
	spinner: ProgressSpinner,
	{ locale, provider, count }: { locale: string; provider: string; count: number }
) => {
	const chinese = /^zh(?:[-_]|$)/i.test(locale);
	const labels: Record<GenerationProgress['stage'], string> = chinese ? {
		'reading-diff': '读取暂存差异',
		waiting: '请求 AI，等待响应',
		'waiting-complete': '请求 AI，等待完整响应（非流式）',
		thinking: 'AI 正在思考',
		receiving: 'AI 正在响应',
		tool: 'AI 正在调用工具',
		validating: '校验生成结果',
	} : {
		'reading-diff': 'Reading staged changes',
		waiting: 'Requesting AI, waiting for response',
		'waiting-complete': 'Requesting AI, waiting for full response (non-streaming)',
		thinking: 'AI is thinking',
		receiving: 'Receiving AI response',
		tool: 'AI is calling a tool',
		validating: 'Validating generated message',
	};
	const startedAt = Date.now();
	const candidates = Array.from({ length: count }, () => ({
		stage: 'reading-diff' as GenerationProgress['stage'],
		done: false,
	}));
	let stopped = false;
	const elapsed = () => ((Date.now() - startedAt) / 1000).toFixed(1);
	const render = () => {
		const completed = candidates.filter(({ done }) => done).length;
		const active = candidates.find(({ done }) => !done);
		const status = labels[active?.stage ?? 'validating'];
		const counter = count > 1 ? ` · ${completed}/${count}` : '';
		return `${status} · ${provider}${counter} · ${chinese ? '已用时' : 'elapsed'} ${elapsed()}s`;
	};
	spinner.start(render());
	const timer = setInterval(() => spinner.message(render()), 100);
	timer.unref();
	return {
		update: (index: number, event: GenerationProgress) => {
			if (stopped) return;
			candidates[index].stage = event.stage;
		},
		complete: (index: number) => {
			if (!stopped) candidates[index].done = true;
		},
		stop: (success: boolean) => {
			if (stopped) return;
			stopped = true;
			clearInterval(timer);
			spinner.stop(
				chinese
					? `${success ? '✅ 生成完成' : '❌ 生成失败'} · 用时 ${elapsed()}s`
					: `${success ? '✅ Generation completed' : '❌ Generation failed'} in ${elapsed()}s`,
				success ? 0 : 1
			);
		},
	};
};
